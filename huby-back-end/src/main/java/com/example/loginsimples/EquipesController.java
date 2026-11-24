package com.example.loginsimples;

import org.springframework.http.HttpStatus;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.text.Normalizer;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.net.URI;

@RestController
@RequestMapping("/api/eventos")
@CrossOrigin(origins = "*")
public class EquipesController {

    private static final int NOME_MIN = 3;
    private static final int NOME_MAX = 50;
    private static final int USUARIO_MIN = 2;
    private static final int USUARIO_MAX = 30;
    private static final int TAMANHO_PADRAO = 4;
    private static final int INTEGRANTES_MIN = 2;

    private static final String CLOUDINARY_PREFIXO = "https://res.cloudinary.com/";

    private static final Set<String> EXPERIENCIAS = Set.of("INICIANTE", "INTERMEDIARIO", "AVANCADO");
    private static final Set<String> MODELOS = Set.of("COMUM", "SURPRESA", "INDIVIDUAL");

    private final ConteudoRepository conteudoRepository;
    private final EquipeRepository equipeRepository;
    private final FuncaoEquipeRepository funcaoRepository;
    private final UsuarioRepository usuarioRepository;
    private final MensagemRepository mensagemRepository;
    private final ProcurandoEquipeRepository procurandoEquipeRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final EventoService eventoService;

    public EquipesController(ConteudoRepository conteudoRepository,
                             EquipeRepository equipeRepository,
                             FuncaoEquipeRepository funcaoRepository,
                             UsuarioRepository usuarioRepository,
                             MensagemRepository mensagemRepository,
                             ProcurandoEquipeRepository procurandoEquipeRepository,
                             SimpMessagingTemplate messagingTemplate,
                             EventoService eventoService) {
        this.conteudoRepository = conteudoRepository;
        this.equipeRepository = equipeRepository;
        this.funcaoRepository = funcaoRepository;
        this.usuarioRepository = usuarioRepository;
        this.mensagemRepository = mensagemRepository;
        this.procurandoEquipeRepository = procurandoEquipeRepository;
        this.messagingTemplate = messagingTemplate;
        this.eventoService = eventoService;
    }

    public record IntegranteDTO(String nomeUsuario, String funcao) {
    }

    public record NovaEquipeDTO(String nome, String experiencia, String imagem, String avatar,
                                String criadorId,
                                Boolean abertaParaSolicitacoes,
                                List<IntegranteDTO> integrantes) {
    }

    public record SolicitacaoEquipeDTO(String usuarioId) {
    }

    public record EntregaDTO(String usuarioId, String titulo, String descricao, String linkUrl, String imagem) {
    }

    @GetMapping("/funcoes")
    public List<FuncaoEquipe> funcoes() {
        return funcaoRepository.findAllByOrderByOrdemAsc();
    }

    @GetMapping("/{id}")
    public Conteudo evento(@PathVariable String id) {
        Conteudo evento = conteudoRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Evento não encontrado."));
        return eventoService.apresentar(evento);
    }

    @GetMapping("/{id}/equipes")
    public List<Equipe> equipes(@PathVariable String id) {
        return equipeRepository.findByEventoIdOrderByCriadoEmDesc(id).stream()
                .filter(equipe -> !Boolean.TRUE.equals(equipe.getAguardandoSorteio()))
                .toList();
    }

    @PostMapping("/{id}/equipes")
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    public Equipe inscrever(@PathVariable String id, @RequestBody NovaEquipeDTO dto) {
        Conteudo evento = conteudoRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Evento não encontrado."));

        if (evento.getTipo() != TipoConteudo.EVENTO && evento.getTipo() != TipoConteudo.GAME_JAM) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Só é possível inscrever equipes em eventos e game jams.");
        }

        PeriodoEvento.validarInscricoes(evento);

        String experiencia = normalizar(dto.experiencia());
        if (!EXPERIENCIAS.contains(experiencia)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Escolha a experiência da equipe: iniciante, intermediário ou avançado.");
        }

        String modelo = evento.getModeloEquipe() == null || evento.getModeloEquipe().isBlank()
                ? "COMUM" : normalizar(evento.getModeloEquipe());
        if (!MODELOS.contains(modelo)) {
            modelo = "COMUM";
        }

        boolean comum = "COMUM".equals(modelo);
        int minimo = comum ? INTEGRANTES_MIN : 1;
        int maximo = Math.max(INTEGRANTES_MIN,
                evento.getTamanhoEquipe() != null ? evento.getTamanhoEquipe() : TAMANHO_PADRAO);

        List<IntegranteDTO> integrantesDto = dto.integrantes() == null ? List.of() : dto.integrantes();

        if ("SURPRESA".equals(modelo) && integrantesDto.size() != 1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Na equipe surpresa, cada pessoa faz uma inscrição individual.");
        }

        if (integrantesDto.size() < minimo || integrantesDto.size() > maximo) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "A equipe precisa ter entre " + (comum ? minimo : 1) + " e " + maximo + " integrantes.");
        }

        List<IntegranteEquipe> integrantes = new ArrayList<>();
        Set<String> usuarios = new HashSet<>();

        for (IntegranteDTO integrante : integrantesDto) {
            String usuario = integrante == null || integrante.nomeUsuario() == null
                    ? "" : integrante.nomeUsuario().trim().replaceFirst("^[@#]+", "");
            if (usuario.length() < USUARIO_MIN || usuario.length() > USUARIO_MAX) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Informe um @usuário entre " + USUARIO_MIN + " e " + USUARIO_MAX + " caracteres para cada integrante.");
            }

            Usuario usuarioCadastrado = usuarioRepository.findByUsernameIgnoreCase(usuario);
            if (usuarioCadastrado == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "O usuário @" + usuario + " não foi encontrado na Huby.");
            }

            String funcao = integrante.funcao() == null ? "" : integrante.funcao().trim();
            if (funcaoRepository.findByNomeIgnoreCase(funcao).isEmpty()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Função inválida para o integrante @" + usuario + ".");
            }

            if (!usuarios.add(usuario.toLowerCase(Locale.ROOT))) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Cada integrante precisa ter um usuário diferente.");
            }

            String avatarIntegrante = usuarioCadastrado.getAvatarUrl() == null
                    ? "" : usuarioCadastrado.getAvatarUrl().trim();
            integrantes.add(new IntegranteEquipe(usuario, funcao, avatarIntegrante));
        }

        for (IntegranteEquipe candidato : integrantes) {
            Usuario usuarioCandidato = usuarioRepository.findByUsernameIgnoreCase(candidato.getNomeUsuario());
            if (usuarioCandidato != null && participaDeOutraEquipe(id, usuarioCandidato, null)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "O usuário @" + candidato.getNomeUsuario() + " já está inscrito neste evento.");
            }
        }

        String nome;
        if (comum) {
            nome = dto.nome() == null ? "" : dto.nome().trim();
            if (nome.length() < NOME_MIN || nome.length() > NOME_MAX) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "O nome da equipe deve ter entre " + NOME_MIN + " e " + NOME_MAX + " caracteres.");
            }

            if (equipeRepository.existsByEventoIdAndNomeIgnoreCase(id, nome)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "Já existe uma equipe com esse nome neste evento.");
            }
        } else {
            nome = "SURPRESA".equals(modelo)
                    ? "Inscrição Surpresa - " + integrantes.get(0).getNomeUsuario()
                    : integrantes.get(0).getNomeUsuario();
        }

        Usuario liderSelecionado = null;
        if (dto.criadorId() != null && !dto.criadorId().isBlank()) {
            liderSelecionado = usuarioRepository.findById(dto.criadorId().trim()).orElse(null);
        }
        if (liderSelecionado == null) {
            for (IntegranteEquipe integrante : integrantes) {
                Usuario candidato = usuarioRepository.findByUsernameIgnoreCase(integrante.getNomeUsuario());
                if (candidato != null) {
                    liderSelecionado = candidato;
                    break;
                }
            }
        }
        Usuario lider = liderSelecionado;
        if (lider == null || lider.getUsername() == null
                || integrantes.stream().noneMatch(integrante ->
                        integrante.getNomeUsuario().equalsIgnoreCase(lider.getUsername()))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "O líder da equipe precisa estar entre os integrantes.");
        }

        if (comum) {
            String usuarioLider = lider == null || lider.getUsername() == null ? "" : lider.getUsername();
            for (IntegranteEquipe integrante : integrantes) {
                boolean ehLider = !usuarioLider.isEmpty()
                        && integrante.getNomeUsuario().equalsIgnoreCase(usuarioLider);
                integrante.setStatus(ehLider ? "CONFIRMADO" : "PENDENTE");
            }
        }

        String imagem = dto.imagem() == null ? "" : dto.imagem().trim();
        if (!imagem.isEmpty()
                && (!imagem.startsWith(CLOUDINARY_PREFIXO) || imagem.length() > 500)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "O banner da equipe precisa estar hospedado no Cloudinary.");
        }

        String avatar = dto.avatar() == null ? "" : dto.avatar().trim();
        if (!avatar.isEmpty()
                && (!avatar.startsWith(CLOUDINARY_PREFIXO) || avatar.length() > 500)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "A foto de perfil da equipe precisa estar hospedada no Cloudinary.");
        }

        Equipe equipe = new Equipe();
        equipe.setEventoId(id);
        equipe.setNome(nome);
        equipe.setLiderId(lider == null || lider.getId() == null ? "" : lider.getId());
        equipe.setExperiencia(experiencia);
        equipe.setModelo(modelo);
        equipe.setImagem(imagem);
        equipe.setAvatar(avatar);
        equipe.setAbertaParaSolicitacoes("COMUM".equals(modelo)
                && Boolean.TRUE.equals(dto.abertaParaSolicitacoes()));
        equipe.setAguardandoSorteio("SURPRESA".equals(modelo));
        equipe.setIntegrantes(integrantes);
        equipe.setCriadoEm(LocalDate.now());

        Equipe salva = equipeRepository.save(equipe);
        removerPerfisDeBuscaDosIntegrantes(id, integrantes);

        if (comum) {
            enviarConvitesEquipe(salva, evento, lider, integrantes);
        }

        if (!Boolean.TRUE.equals(salva.getAguardandoSorteio())) {
            List<String> equipesDoEvento = evento.getEquipes() == null
                    ? new ArrayList<>() : new ArrayList<>(evento.getEquipes());
            equipesDoEvento.add(nome);
            evento.setEquipes(equipesDoEvento);
            evento.setEquipesInscritas((evento.getEquipesInscritas() == null ? 0 : evento.getEquipesInscritas()) + 1);
            conteudoRepository.save(evento);
        }

        return salva;
    }

    @PostMapping("/{id}/equipes/{equipeId}/entrega")
    @Transactional
    public Equipe enviarEntrega(@PathVariable String id, @PathVariable String equipeId,
                                @RequestBody EntregaDTO dto) {
        Conteudo evento = conteudoRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Evento não encontrado."));
        Equipe equipe = equipeRepository.findById(equipeId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Equipe não encontrada."));
        if (!id.equals(equipe.getEventoId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Equipe não encontrada neste evento.");
        }

        PeriodoEvento.validarEntrega(evento);
        if (Boolean.TRUE.equals(equipe.getAguardandoSorteio())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Aguarde o sorteio das equipes surpresa antes de enviar o jogo.");
        }

        LocalDate hoje = LocalDate.now();
        String usuarioId = dto == null || dto.usuarioId() == null ? "" : dto.usuarioId().trim();
        Usuario usuario = usuarioRepository.findById(usuarioId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                        "Entre na conta que participa da equipe."));

        boolean participa = usuario.getUsername() != null
                && integrantesAtivos(equipe).stream().anyMatch(item -> item.getNomeUsuario() != null
                        && item.getNomeUsuario().equalsIgnoreCase(usuario.getUsername()));
        if (!participa) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Somente integrantes da equipe podem enviar o jogo.");
        }

        String titulo = dto.titulo() == null ? "" : dto.titulo().trim();
        String descricao = dto.descricao() == null ? "" : dto.descricao().trim();
        String link = dto.linkUrl() == null ? "" : dto.linkUrl().trim();
        if (titulo.length() < 3) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Informe o título do jogo.");
        }
        if (link.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Informe o link externo do jogo.");
        }
        try {
            URI uri = URI.create(link);
            if (!"http".equalsIgnoreCase(uri.getScheme()) && !"https".equalsIgnoreCase(uri.getScheme())) {
                throw new IllegalArgumentException();
            }
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "O link do jogo deve começar com http:// ou https://.");
        }

        equipe.setEntregaTitulo(titulo);
        equipe.setEntregaDescricao(descricao);
        equipe.setEntregaLink(link);
        equipe.setEntregaImagem(dto.imagem() == null ? "" : dto.imagem().trim());
        equipe.setEntregueEm(hoje);

        Conteudo jogo;
        if (equipe.getJogoId() != null && !equipe.getJogoId().isBlank()) {
            jogo = conteudoRepository.findById(equipe.getJogoId()).orElseGet(Conteudo::new);
        } else {
            jogo = new Conteudo();
        }
        jogo.setTipo(TipoConteudo.JOGO);
        jogo.setTitulo(titulo);
        jogo.setDescricao(descricao);
        jogo.setDescricaoLonga(descricao);
        jogo.setDesenvolvedor(usuario.getNomeExibicao() == null
                ? usuario.getUsername() : usuario.getNomeExibicao());
        jogo.setImagem(dto.imagem() == null || dto.imagem().trim().isEmpty()
                ? evento.getImagem() : dto.imagem().trim());
        jogo.setTags(evento.getTags() == null ? new ArrayList<>() : new ArrayList<>(evento.getTags()));
        jogo.setPlataformas(new ArrayList<>());
        jogo.setDataPublicacao(hoje);
        jogo.setGameJamId(id);
        jogo.setLinkUrl(link);
        jogo.setCriadorId(usuarioId);
        jogo.setRelevancia(0);
        jogo.setNota(0.0);
        jogo.setAvaliacoes(0);

        Conteudo jogoSalvo = conteudoRepository.save(jogo);
        equipe.setJogoId(jogoSalvo.getId());
        return equipeRepository.save(equipe);
    }

    @PostMapping("/{id}/equipes/{equipeId}/solicitacoes")
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    public Mensagem solicitarEntrada(@PathVariable String id, @PathVariable String equipeId,
                                     @RequestBody SolicitacaoEquipeDTO dto) {
        Conteudo evento = conteudoRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Evento não encontrado."));
        PeriodoEvento.validarInscricoes(evento);

        Equipe equipe = equipeRepository.findById(equipeId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Equipe não encontrada."));

        if (!id.equals(equipe.getEventoId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Equipe não encontrada neste evento.");
        }

        String modelo = equipe.getModelo() == null || equipe.getModelo().isBlank()
                ? "COMUM" : equipe.getModelo();
        if (Boolean.TRUE.equals(equipe.getAguardandoSorteio())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Esta inscrição ainda será sorteada em uma equipe surpresa.");
        }
        if (!"COMUM".equals(modelo) || !Boolean.TRUE.equals(equipe.getAbertaParaSolicitacoes())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Esta equipe não está aceitando pedidos de entrada.");
        }

        String usuarioId = dto == null || dto.usuarioId() == null ? "" : dto.usuarioId().trim();
        if (usuarioId.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Informe o usuário que quer entrar na equipe.");
        }

        Usuario solicitante = usuarioRepository.findById(usuarioId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuário não encontrado."));

        int maximo = Math.max(INTEGRANTES_MIN,
                evento.getTamanhoEquipe() != null ? evento.getTamanhoEquipe() : TAMANHO_PADRAO);
        int total = integrantesAtivos(equipe).size();
        if (total >= maximo) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A equipe já está completa.");
        }

        String username = solicitante.getUsername() == null ? "" : solicitante.getUsername();
        boolean jaParticipa = integrantesAtivos(equipe).stream()
                .anyMatch(item -> item.getNomeUsuario() != null
                        && item.getNomeUsuario().equalsIgnoreCase(username));
        if (jaParticipa) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Você já faz parte desta equipe.");
        }
        if (participaDeOutraEquipe(id, solicitante, equipeId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Você já está inscrito em outra equipe deste evento.");
        }

        boolean pendente = mensagemRepository.existsByEquipeIdAndRemetenteIdAndTipoAndConviteStatus(
                equipeId, usuarioId, "PEDIDO_EQUIPE", "PENDENTE");
        if (pendente) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Você já enviou um pedido para esta equipe.");
        }

        Usuario lider = resolverLider(equipe);
        if (lider == null || lider.getId() == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "O líder desta equipe não foi encontrado.");
        }
        if (lider.getId().equals(solicitante.getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Você é o líder desta equipe.");
        }

        Mensagem pedido = new Mensagem();
        pedido.setRemetenteId(solicitante.getId());
        pedido.setDestinatarioId(lider.getId());
        pedido.setTexto(nomeExibicao(solicitante) + " quer entrar na equipe " + equipe.getNome()
                + " em " + evento.getTitulo() + ".");
        pedido.setTipo("PEDIDO_EQUIPE");
        pedido.setEquipeId(equipe.getId());
        pedido.setEventoId(evento.getId());
        pedido.setEventoTitulo(evento.getTitulo());
        pedido.setEquipeNome(equipe.getNome());
        pedido.setFuncao("");
        pedido.setConviteStatus("PENDENTE");
        pedido.setDataHora(LocalDateTime.now());

        Mensagem salva = mensagemRepository.save(pedido);
        notificarMensagem(salva, lider.getId(), solicitante.getId());

        return salva;
    }

    private void removerPerfisDeBuscaDosIntegrantes(String eventoId, List<IntegranteEquipe> integrantes) {
        for (IntegranteEquipe integrante : integrantes) {
            if (integrante == null || integrante.getNomeUsuario() == null) continue;
            Usuario usuario = usuarioRepository.findByUsernameIgnoreCase(integrante.getNomeUsuario());
            if (usuario == null || usuario.getId() == null) continue;

            procurandoEquipeRepository.deleteByEventoIdAndUsuarioId(eventoId, usuario.getId());
            List<Mensagem> pedidos = mensagemRepository
                    .findByDestinatarioIdAndEventoIdAndTipoAndOrigemAndConviteStatus(
                            usuario.getId(), eventoId, "PEDIDO_EQUIPE", "PERFIL_BUSCA", "PENDENTE");
            for (Mensagem pedido : pedidos) {
                pedido.setConviteStatus("RECUSADO");
                Mensagem salva = mensagemRepository.save(pedido);
                notificarMensagem(salva, salva.getDestinatarioId(), salva.getRemetenteId());
            }
        }
    }

    private boolean participaDeOutraEquipe(String eventoId, Usuario usuario, String equipeId) {
        String username = usuario.getUsername() == null ? "" : usuario.getUsername();
        return equipeRepository.findByEventoIdOrderByCriadoEmDesc(eventoId).stream()
                .anyMatch(equipe -> (equipeId == null || !equipeId.equals(equipe.getId()))
                        && (usuario.getId().equals(equipe.getLiderId())
                                || integrantesAtivos(equipe).stream().anyMatch(item ->
                                        item.getNomeUsuario() != null
                                                && item.getNomeUsuario().equalsIgnoreCase(username))));
    }

    private List<IntegranteEquipe> integrantesAtivos(Equipe equipe) {
        if (equipe.getIntegrantes() == null) return List.of();
        return equipe.getIntegrantes().stream()
                .filter(integrante -> integrante != null && !"RECUSADO".equals(integrante.getStatus()))
                .toList();
    }

    private void notificarMensagem(Mensagem mensagem, String... usuariosIds) {
        Runnable envio = () -> {
            for (String usuarioId : usuariosIds) {
                messagingTemplate.convertAndSend("/topic/mensagens/" + usuarioId, mensagem);
            }
        };

        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    envio.run();
                }
            });
        } else {
            envio.run();
        }
    }

    private Usuario resolverLider(Equipe equipe) {
        if (equipe.getLiderId() != null && !equipe.getLiderId().isBlank()) {
            Usuario lider = usuarioRepository.findById(equipe.getLiderId()).orElse(null);
            if (lider != null) return lider;
        }

        if (equipe.getIntegrantes() == null) return null;

        for (IntegranteEquipe integrante : equipe.getIntegrantes()) {
            if (integrante == null || integrante.getNomeUsuario() == null) continue;
            if (!"CONFIRMADO".equals(integrante.getStatus())) continue;

            Usuario candidato = usuarioRepository.findByUsernameIgnoreCase(integrante.getNomeUsuario());
            if (candidato != null) return candidato;
        }

        for (IntegranteEquipe integrante : integrantesAtivos(equipe)) {
            if (integrante.getNomeUsuario() == null) continue;
            return usuarioRepository.findByUsernameIgnoreCase(integrante.getNomeUsuario());
        }

        return null;
    }

    private void enviarConvitesEquipe(Equipe equipe, Conteudo evento, Usuario lider,
                                      List<IntegranteEquipe> integrantes) {
        if (lider == null || lider.getId() == null) return;

        String nomeLider = nomeExibicao(lider);

        for (IntegranteEquipe integrante : integrantes) {
            if (!"PENDENTE".equals(integrante.getStatus())) continue;

            Usuario convidado = usuarioRepository.findByUsernameIgnoreCase(integrante.getNomeUsuario());
            if (convidado == null || convidado.getId() == null || convidado.getId().equals(lider.getId())) {
                continue;
            }

            Mensagem convite = new Mensagem();
            convite.setRemetenteId(lider.getId());
            convite.setDestinatarioId(convidado.getId());
            convite.setTexto(nomeLider + " te convidou para participar da equipe " + equipe.getNome()
                    + " em " + evento.getTitulo() + " como " + integrante.getFuncao() + ".");
            convite.setTipo("CONVITE_EQUIPE");
            convite.setEquipeId(equipe.getId());
            convite.setEventoId(evento.getId());
            convite.setEventoTitulo(evento.getTitulo());
            convite.setEquipeNome(equipe.getNome());
            convite.setFuncao(integrante.getFuncao());
            convite.setConviteStatus("PENDENTE");
            convite.setDataHora(LocalDateTime.now());

            Mensagem salva = mensagemRepository.save(convite);
            notificarMensagem(salva, convidado.getId());
        }
    }

    private String nomeExibicao(Usuario usuario) {
        if (usuario.getNomeExibicao() != null && !usuario.getNomeExibicao().isBlank()) {
            return usuario.getNomeExibicao();
        }
        if (usuario.getUsername() != null && !usuario.getUsername().isBlank()) {
            return usuario.getUsername();
        }
        return usuario.getLogin() == null ? "Alguém" : usuario.getLogin();
    }

    private String normalizar(String valor) {
        if (valor == null) return "";
        return Normalizer.normalize(valor.trim(), Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toUpperCase(Locale.ROOT);
    }
}
