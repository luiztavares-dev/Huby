package com.example.loginsimples;

import org.springframework.http.HttpStatus;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/api/eventos")
@CrossOrigin(origins = "*")
public class ProcurandoEquipeController {

    private static final int DESCRICAO_MIN = 10;
    private static final int DESCRICAO_MAX = 600;
    private static final int TAMANHO_PADRAO = 4;
    private static final int INTEGRANTES_MIN = 2;

    private final ConteudoRepository conteudoRepository;
    private final ProcurandoEquipeRepository procurandoEquipeRepository;
    private final FuncaoEquipeRepository funcaoRepository;
    private final UsuarioRepository usuarioRepository;
    private final EquipeRepository equipeRepository;
    private final MensagemRepository mensagemRepository;
    private final SimpMessagingTemplate messagingTemplate;

    public ProcurandoEquipeController(ConteudoRepository conteudoRepository,
                                      ProcurandoEquipeRepository procurandoEquipeRepository,
                                      FuncaoEquipeRepository funcaoRepository,
                                      UsuarioRepository usuarioRepository,
                                      EquipeRepository equipeRepository,
                                      MensagemRepository mensagemRepository,
                                      SimpMessagingTemplate messagingTemplate) {
        this.conteudoRepository = conteudoRepository;
        this.procurandoEquipeRepository = procurandoEquipeRepository;
        this.funcaoRepository = funcaoRepository;
        this.usuarioRepository = usuarioRepository;
        this.equipeRepository = equipeRepository;
        this.mensagemRepository = mensagemRepository;
        this.messagingTemplate = messagingTemplate;
    }

    public record SalvarProcurandoEquipeDTO(String usuarioId, String funcao, String descricao) {
    }

    public record PedidoPerfilDTO(String usuarioId, String equipeId) {
    }

    public record PerfilProcurandoEquipeDTO(
            String id,
            String eventoId,
            String usuarioId,
            String nomeExibicao,
            String username,
            String avatarUrl,
            String bannerUrl,
            String funcao,
            String descricao,
            LocalDateTime criadoEm,
            LocalDateTime atualizadoEm
    ) {
    }

    @GetMapping("/{id}/procurando-equipe")
    public List<PerfilProcurandoEquipeDTO> listar(@PathVariable String id) {
        eventoComum(id);

        List<PerfilProcurandoEquipeDTO> perfis = new ArrayList<>();
        for (ProcurandoEquipe perfil : procurandoEquipeRepository.findByEventoIdOrderByAtualizadoEmDesc(id)) {
            Usuario usuario = usuarioRepository.findById(perfil.getUsuarioId()).orElse(null);
            if (usuario != null && !participaDeEquipe(id, usuario)) perfis.add(paraDTO(perfil, usuario));
        }
        return perfis;
    }

    @PostMapping("/{id}/procurando-equipe")
    public PerfilProcurandoEquipeDTO salvar(@PathVariable String id,
                                             @RequestBody SalvarProcurandoEquipeDTO dto) {
        Conteudo evento = eventoComum(id);
        validarPeriodoInscricoes(evento);

        String usuarioId = dto == null || dto.usuarioId() == null ? "" : dto.usuarioId().trim();
        Usuario usuario = usuarioRepository.findById(usuarioId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuário não encontrado."));

        if (participaDeEquipe(evento.getId(), usuario)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Você já está inscrito em uma equipe deste evento. Remova sua inscrição antes de procurar outra equipe.");
        }

        String funcao = dto.funcao() == null ? "" : dto.funcao().trim();
        if (funcaoRepository.findByNomeIgnoreCase(funcao).isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Escolha uma função válida.");
        }

        String descricao = dto.descricao() == null ? "" : dto.descricao().trim();
        if (descricao.length() < DESCRICAO_MIN || descricao.length() > DESCRICAO_MAX) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Conte sobre você em uma descrição de " + DESCRICAO_MIN + " a " + DESCRICAO_MAX + " caracteres.");
        }

        LocalDateTime agora = LocalDateTime.now();
        ProcurandoEquipe perfil = procurandoEquipeRepository
                .findByEventoIdAndUsuarioId(id, usuarioId)
                .orElseGet(ProcurandoEquipe::new);

        if (perfil.getId() == null) {
            perfil.setEventoId(id);
            perfil.setUsuarioId(usuarioId);
            perfil.setCriadoEm(agora);
        }
        perfil.setFuncao(funcao);
        perfil.setDescricao(descricao);
        perfil.setAtualizadoEm(agora);

        return paraDTO(procurandoEquipeRepository.save(perfil), usuario);
    }

    @DeleteMapping("/{id}/procurando-equipe")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void remover(@PathVariable String id, @RequestParam String usuarioId) {
        eventoComum(id);

        ProcurandoEquipe perfil = procurandoEquipeRepository.findByEventoIdAndUsuarioId(id, usuarioId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Seu perfil de procura não foi encontrado."));

        procurandoEquipeRepository.delete(perfil);
        cancelarPedidosPendentes(perfil, null);
    }

    @PostMapping("/{id}/procurando-equipe/{perfilId}/pedidos")
    @ResponseStatus(HttpStatus.CREATED)
    public Mensagem enviarPedido(@PathVariable String id,
                                 @PathVariable String perfilId,
                                 @RequestBody PedidoPerfilDTO dto) {
        Conteudo evento = eventoComum(id);
        validarPeriodoInscricoes(evento);

        String usuarioId = dto == null || dto.usuarioId() == null ? "" : dto.usuarioId().trim();
        Usuario remetente = usuarioRepository.findById(usuarioId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                        "Entre na conta que lidera a equipe."));

        ProcurandoEquipe perfil = procurandoEquipeRepository.findById(perfilId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Este perfil não está mais procurando equipe."));
        if (!id.equals(perfil.getEventoId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Este perfil pertence a outro evento.");
        }

        Usuario candidato = usuarioRepository.findById(perfil.getUsuarioId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuário não encontrado."));
        if (candidato.getId().equals(remetente.getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Você não pode enviar um pedido para si mesmo.");
        }
        if (participaDeEquipe(id, candidato)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Este usuário já está inscrito em uma equipe.");
        }

        String equipeId = dto.equipeId() == null ? "" : dto.equipeId().trim();
        Equipe equipe = equipeRepository.findById(equipeId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Equipe não encontrada."));
        if (!id.equals(equipe.getEventoId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Equipe não encontrada neste evento.");
        }
        if (!"COMUM".equals(equipe.getModelo()) || !Boolean.TRUE.equals(equipe.getAbertaParaSolicitacoes())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Sua equipe precisa estar aberta para encontrar integrantes.");
        }
        if (!usuarioId.equals(equipe.getLiderId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Somente o líder da equipe pode enviar pedidos pelo perfil de procura.");
        }

        int maximo = Math.max(INTEGRANTES_MIN,
                evento.getTamanhoEquipe() != null ? evento.getTamanhoEquipe() : TAMANHO_PADRAO);
        int total = integrantesAtivos(equipe).size();
        if (total >= maximo) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Sua equipe já está completa.");
        }

        boolean pendente = mensagemRepository
                .existsByEquipeIdAndRemetenteIdAndDestinatarioIdAndTipoAndOrigemAndConviteStatus(
                        equipeId, usuarioId, candidato.getId(), "PEDIDO_EQUIPE", "PERFIL_BUSCA", "PENDENTE");
        if (pendente) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Você já enviou um pedido para este perfil.");
        }

        Mensagem pedido = new Mensagem();
        pedido.setRemetenteId(remetente.getId());
        pedido.setDestinatarioId(candidato.getId());
        pedido.setTexto(nomeExibicao(remetente) + " quer você na equipe " + equipe.getNome()
                + " em " + evento.getTitulo() + " como " + perfil.getFuncao() + ".");
        pedido.setTipo("PEDIDO_EQUIPE");
        pedido.setOrigem("PERFIL_BUSCA");
        pedido.setEquipeId(equipe.getId());
        pedido.setEventoId(evento.getId());
        pedido.setEventoTitulo(evento.getTitulo());
        pedido.setEquipeNome(equipe.getNome());
        pedido.setFuncao(perfil.getFuncao());
        pedido.setConviteStatus("PENDENTE");
        pedido.setDataHora(LocalDateTime.now());

        Mensagem salva = mensagemRepository.save(pedido);
        messagingTemplate.convertAndSend("/topic/mensagens/" + candidato.getId(), salva);
        messagingTemplate.convertAndSend("/topic/mensagens/" + remetente.getId(), salva);
        return salva;
    }

    private Conteudo eventoComum(String id) {
        Conteudo evento = conteudoRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Evento não encontrado."));
        if (evento.getTipo() != TipoConteudo.EVENTO && evento.getTipo() != TipoConteudo.GAME_JAM) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Só é possível procurar equipe em eventos e game jams.");
        }
        String modelo = evento.getModeloEquipe() == null || evento.getModeloEquipe().isBlank()
                ? "COMUM" : evento.getModeloEquipe();
        if (!"COMUM".equals(modelo)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Esta game jam não utiliza equipes comuns formadas pelos participantes.");
        }
        return evento;
    }

    private void validarPeriodoInscricoes(Conteudo evento) {
        PeriodoEvento.validarInscricoes(evento);
    }

    private boolean participaDeEquipe(String eventoId, Usuario usuario) {
        String username = usuario.getUsername() == null ? "" : usuario.getUsername();
        return equipeRepository.findByEventoIdOrderByCriadoEmDesc(eventoId).stream()
                .anyMatch(equipe -> usuario.getId().equals(equipe.getLiderId())
                        || integrantesAtivos(equipe).stream().anyMatch(integrante ->
                                integrante.getNomeUsuario() != null
                                        && integrante.getNomeUsuario().equalsIgnoreCase(username)));
    }

    private List<IntegranteEquipe> integrantesAtivos(Equipe equipe) {
        if (equipe.getIntegrantes() == null) return List.of();
        return equipe.getIntegrantes().stream()
                .filter(integrante -> integrante != null && !"RECUSADO".equals(integrante.getStatus()))
                .toList();
    }

    private PerfilProcurandoEquipeDTO paraDTO(ProcurandoEquipe perfil, Usuario usuario) {
        return new PerfilProcurandoEquipeDTO(
                perfil.getId(),
                perfil.getEventoId(),
                perfil.getUsuarioId(),
                nomeExibicao(usuario),
                usuario.getUsername() == null ? "" : usuario.getUsername(),
                usuario.getAvatarUrl() == null ? "" : usuario.getAvatarUrl(),
                usuario.getBannerUrl() == null ? "" : usuario.getBannerUrl(),
                perfil.getFuncao(),
                perfil.getDescricao(),
                perfil.getCriadoEm(),
                perfil.getAtualizadoEm()
        );
    }

    private void cancelarPedidosPendentes(ProcurandoEquipe perfil, String idExcluido) {
        List<Mensagem> pedidos = mensagemRepository
                .findByDestinatarioIdAndEventoIdAndTipoAndOrigemAndConviteStatus(
                        perfil.getUsuarioId(), perfil.getEventoId(), "PEDIDO_EQUIPE", "PERFIL_BUSCA", "PENDENTE");
        for (Mensagem pedido : pedidos) {
            if (idExcluido != null && idExcluido.equals(pedido.getId())) continue;
            pedido.setConviteStatus("RECUSADO");
            Mensagem salva = mensagemRepository.save(pedido);
            messagingTemplate.convertAndSend("/topic/mensagens/" + salva.getDestinatarioId(), salva);
            messagingTemplate.convertAndSend("/topic/mensagens/" + salva.getRemetenteId(), salva);
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
}
