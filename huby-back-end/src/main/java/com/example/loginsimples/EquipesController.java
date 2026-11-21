package com.example.loginsimples;

import org.springframework.http.HttpStatus;
import org.springframework.messaging.simp.SimpMessagingTemplate;
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
    private final SimpMessagingTemplate messagingTemplate;

    public EquipesController(ConteudoRepository conteudoRepository,
                             EquipeRepository equipeRepository,
                             FuncaoEquipeRepository funcaoRepository,
                             UsuarioRepository usuarioRepository,
                             MensagemRepository mensagemRepository,
                             SimpMessagingTemplate messagingTemplate) {
        this.conteudoRepository = conteudoRepository;
        this.equipeRepository = equipeRepository;
        this.funcaoRepository = funcaoRepository;
        this.usuarioRepository = usuarioRepository;
        this.mensagemRepository = mensagemRepository;
        this.messagingTemplate = messagingTemplate;
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

    @GetMapping("/funcoes")
    public List<FuncaoEquipe> funcoes() {
        return funcaoRepository.findAllByOrderByOrdemAsc();
    }

    @GetMapping("/{id}")
    public Conteudo evento(@PathVariable String id) {
        return conteudoRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Evento não encontrado."));
    }

    @GetMapping("/{id}/equipes")
    public List<Equipe> equipes(@PathVariable String id) {
        return equipeRepository.findByEventoIdOrderByCriadoEmDesc(id);
    }

    @PostMapping("/{id}/equipes")
    @ResponseStatus(HttpStatus.CREATED)
    public Equipe inscrever(@PathVariable String id, @RequestBody NovaEquipeDTO dto) {
        Conteudo evento = conteudoRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Evento não encontrado."));

        if (evento.getTipo() != TipoConteudo.EVENTO && evento.getTipo() != TipoConteudo.GAME_JAM) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Só é possível inscrever equipes em eventos e game jams.");
        }

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
                    ? "Equipe Surpresa - " + integrantes.get(0).getNomeUsuario()
                    : integrantes.get(0).getNomeUsuario();
        }

        Usuario lider = null;
        if (dto.criadorId() != null && !dto.criadorId().isBlank()) {
            lider = usuarioRepository.findById(dto.criadorId().trim()).orElse(null);
        }
        if (lider == null) {
            for (IntegranteEquipe integrante : integrantes) {
                Usuario candidato = usuarioRepository.findByUsernameIgnoreCase(integrante.getNomeUsuario());
                if (candidato != null) {
                    lider = candidato;
                    break;
                }
            }
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
        equipe.setAbertaParaSolicitacoes("SURPRESA".equals(modelo)
                || Boolean.TRUE.equals(dto.abertaParaSolicitacoes()));
        equipe.setIntegrantes(integrantes);
        equipe.setCriadoEm(LocalDate.now());

        Equipe salva = equipeRepository.save(equipe);

        if (comum) {
            enviarConvitesEquipe(salva, evento, lider, integrantes);
        }

        List<String> equipesDoEvento = evento.getEquipes() == null
                ? new ArrayList<>() : new ArrayList<>(evento.getEquipes());
        equipesDoEvento.add(nome);
        evento.setEquipes(equipesDoEvento);
        evento.setEquipesInscritas((evento.getEquipesInscritas() == null ? 0 : evento.getEquipesInscritas()) + 1);
        conteudoRepository.save(evento);

        return salva;
    }

    @PostMapping("/{id}/equipes/{equipeId}/solicitacoes")
    @ResponseStatus(HttpStatus.CREATED)
    public Mensagem solicitarEntrada(@PathVariable String id, @PathVariable String equipeId,
                                     @RequestBody SolicitacaoEquipeDTO dto) {
        Conteudo evento = conteudoRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Evento não encontrado."));

        Equipe equipe = equipeRepository.findById(equipeId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Equipe não encontrada."));

        if (!id.equals(equipe.getEventoId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Equipe não encontrada neste evento.");
        }

        String modelo = equipe.getModelo() == null || equipe.getModelo().isBlank()
                ? "COMUM" : equipe.getModelo();
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
        int total = equipe.getIntegrantes() == null ? 0 : equipe.getIntegrantes().size();
        if (total >= maximo) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A equipe já está completa.");
        }

        String username = solicitante.getUsername() == null ? "" : solicitante.getUsername();
        boolean jaParticipa = equipe.getIntegrantes() != null && equipe.getIntegrantes().stream()
                .anyMatch(item -> item != null && item.getNomeUsuario() != null
                        && item.getNomeUsuario().equalsIgnoreCase(username));
        if (jaParticipa) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Você já faz parte desta equipe.");
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
        messagingTemplate.convertAndSend("/topic/mensagens/" + lider.getId(), salva);
        messagingTemplate.convertAndSend("/topic/mensagens/" + solicitante.getId(), salva);

        return salva;
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

        for (IntegranteEquipe integrante : equipe.getIntegrantes()) {
            if (integrante == null || integrante.getNomeUsuario() == null) continue;
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
            messagingTemplate.convertAndSend("/topic/mensagens/" + convidado.getId(), salva);
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
