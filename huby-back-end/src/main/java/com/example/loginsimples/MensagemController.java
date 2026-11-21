package com.example.loginsimples;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/mensagens")
@CrossOrigin(origins = "*")
public class MensagemController {

    @Autowired
    private MensagemRepository mensagemRepository;

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private EquipeRepository equipeRepository;

    @Autowired
    private ConteudoRepository conteudoRepository;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    public record RespostaConviteDTO(String usuarioId) {
    }

    @PostMapping
    public ResponseEntity<Mensagem> enviarMensagem(@RequestBody Mensagem mensagem) {
        mensagem.setDataHora(LocalDateTime.now());
        mensagem.setTipo("TEXTO");
        mensagem.setEquipeId("");
        mensagem.setEventoId("");
        mensagem.setEventoTitulo("");
        mensagem.setEquipeNome("");
        mensagem.setFuncao("");
        mensagem.setConviteStatus("");
        Mensagem salva = mensagemRepository.save(mensagem);

        messagingTemplate.convertAndSend("/topic/mensagens/" + salva.getDestinatarioId(), salva);

        return ResponseEntity.ok(salva);
    }

    @GetMapping("/{meuId}/{outroId}")
    public ResponseEntity<List<Mensagem>> buscarHistorico(@PathVariable String meuId, @PathVariable String outroId) {
        List<Mensagem> historico = mensagemRepository.findHistoricoDeConversa(meuId, outroId);
        return ResponseEntity.ok(historico);
    }

    @GetMapping("/contatos/{meuId}")
    public ResponseEntity<List<Usuario>> buscarContatos(@PathVariable String meuId) {        List<Mensagem> minhasMensagens = mensagemRepository.findMinhasMensagens(meuId);
        
        Set<String> contatosIds = new HashSet<>();
        
        for (Mensagem m : minhasMensagens) {
            if (!m.getRemetenteId().equals(meuId)) {
                contatosIds.add(m.getRemetenteId());
            }
            if (!m.getDestinatarioId().equals(meuId)) {
                contatosIds.add(m.getDestinatarioId());
            }
        }

        List<Usuario> contatosAtivos = new ArrayList<>();
        for (String contatoId : contatosIds) {
            usuarioRepository.findById(contatoId).ifPresent(contatosAtivos::add);
        }

        return ResponseEntity.ok(contatosAtivos);
    }

    @GetMapping("/pedidos/{usuarioId}")
    public ResponseEntity<List<Mensagem>> meusPedidos(@PathVariable String usuarioId) {
        return ResponseEntity.ok(mensagemRepository
                .findByRemetenteIdAndTipoOrderByDataHoraDesc(usuarioId, "PEDIDO_EQUIPE"));
    }

    @PostMapping("/{id}/pedido/aceitar")
    public ResponseEntity<?> aceitarPedido(@PathVariable String id,
                                           @RequestBody(required = false) RespostaConviteDTO dto) {
        return responderPedido(id, dto, true);
    }

    @PostMapping("/{id}/pedido/recusar")
    public ResponseEntity<?> recusarPedido(@PathVariable String id,
                                           @RequestBody(required = false) RespostaConviteDTO dto) {
        return responderPedido(id, dto, false);
    }

    private ResponseEntity<?> responderPedido(String id, RespostaConviteDTO dto, boolean aceitar) {
        if (dto == null || dto.usuarioId() == null || dto.usuarioId().isBlank()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("mensagem", "Informe o usuário que está respondendo ao pedido."));
        }

        Optional<Mensagem> optional = mensagemRepository.findById(id);
        if (optional.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("mensagem", "Pedido não encontrado."));
        }

        Mensagem pedido = optional.get();

        if (!"PEDIDO_EQUIPE".equals(pedido.getTipo())) {
            return ResponseEntity.badRequest()
                    .body(Map.of("mensagem", "Esta mensagem não é um pedido de entrada."));
        }

        if (!dto.usuarioId().equals(pedido.getDestinatarioId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("mensagem", "Este pedido não pertence à sua equipe."));
        }

        if (!"PENDENTE".equals(pedido.getConviteStatus())) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("mensagem", "Este pedido já foi respondido."));
        }

        Optional<Equipe> equipeOptional = equipeRepository.findById(
                pedido.getEquipeId() == null ? "" : pedido.getEquipeId());
        if (equipeOptional.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("mensagem", "A equipe deste pedido não existe mais."));
        }

        Usuario solicitante = usuarioRepository.findById(pedido.getRemetenteId()).orElse(null);
        if (solicitante == null || solicitante.getId() == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("mensagem", "Usuário do pedido não encontrado."));
        }

        Equipe equipe = equipeOptional.get();

        if (aceitar) {
            String username = solicitante.getUsername() == null ? "" : solicitante.getUsername();
            boolean jaParticipa = equipe.getIntegrantes() != null && equipe.getIntegrantes().stream()
                    .anyMatch(item -> item != null && item.getNomeUsuario() != null
                            && item.getNomeUsuario().equalsIgnoreCase(username));

            if (!jaParticipa) {
                Conteudo evento = conteudoRepository.findById(
                        pedido.getEventoId() == null ? "" : pedido.getEventoId()).orElse(null);
                int maximo = Math.max(2, evento != null && evento.getTamanhoEquipe() != null
                        ? evento.getTamanhoEquipe() : 4);
                int total = equipe.getIntegrantes() == null ? 0 : equipe.getIntegrantes().size();

                if (total >= maximo) {
                    return ResponseEntity.status(HttpStatus.CONFLICT)
                            .body(Map.of("mensagem", "A equipe já está completa."));
                }

                String avatar = solicitante.getAvatarUrl() == null ? "" : solicitante.getAvatarUrl().trim();
                IntegranteEquipe integrante = new IntegranteEquipe(username, "A definir", avatar);
                integrante.setStatus("CONFIRMADO");

                List<IntegranteEquipe> integrantes = equipe.getIntegrantes() == null
                        ? new ArrayList<>() : new ArrayList<>(equipe.getIntegrantes());
                integrantes.add(integrante);
                equipe.setIntegrantes(integrantes);
                equipeRepository.save(equipe);
            }
        }

        pedido.setConviteStatus(aceitar ? "ACEITO" : "RECUSADO");
        Mensagem salva = mensagemRepository.save(pedido);

        messagingTemplate.convertAndSend("/topic/mensagens/" + salva.getDestinatarioId(), salva);
        messagingTemplate.convertAndSend("/topic/mensagens/" + salva.getRemetenteId(), salva);

        return ResponseEntity.ok(salva);
    }

    @PostMapping("/{id}/convite/aceitar")
    public ResponseEntity<?> aceitarConvite(@PathVariable String id,
                                            @RequestBody(required = false) RespostaConviteDTO dto) {
        return responderConvite(id, dto, true);
    }

    @PostMapping("/{id}/convite/recusar")
    public ResponseEntity<?> recusarConvite(@PathVariable String id,
                                            @RequestBody(required = false) RespostaConviteDTO dto) {
        return responderConvite(id, dto, false);
    }

    private ResponseEntity<?> responderConvite(String id, RespostaConviteDTO dto, boolean aceitar) {
        if (dto == null || dto.usuarioId() == null || dto.usuarioId().isBlank()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("mensagem", "Informe o usuário que está respondendo ao convite."));
        }

        Optional<Mensagem> optional = mensagemRepository.findById(id);
        if (optional.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("mensagem", "Convite não encontrado."));
        }

        Mensagem convite = optional.get();

        if (!"CONVITE_EQUIPE".equals(convite.getTipo())) {
            return ResponseEntity.badRequest()
                    .body(Map.of("mensagem", "Esta mensagem não é um convite de equipe."));
        }

        if (!dto.usuarioId().equals(convite.getDestinatarioId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("mensagem", "Este convite não pertence a você."));
        }

        if (!"PENDENTE".equals(convite.getConviteStatus())) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("mensagem", "Este convite já foi respondido."));
        }

        Optional<Equipe> equipeOptional = equipeRepository.findById(
                convite.getEquipeId() == null ? "" : convite.getEquipeId());
        if (equipeOptional.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("mensagem", "A equipe deste convite não existe mais."));
        }

        Usuario convidado = usuarioRepository.findById(dto.usuarioId()).orElse(null);
        if (convidado == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("mensagem", "Usuário do convite não encontrado."));
        }

        String username = convidado.getUsername() == null ? "" : convidado.getUsername();
        Equipe equipe = equipeOptional.get();
        IntegranteEquipe integrante = equipe.getIntegrantes() == null ? null
                : equipe.getIntegrantes().stream()
                        .filter(item -> item != null && item.getNomeUsuario() != null
                                && item.getNomeUsuario().equalsIgnoreCase(username))
                        .findFirst()
                        .orElse(null);

        if (integrante == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("mensagem", "Você não está mais vinculado a esta equipe."));
        }

        if (!"PENDENTE".equals(integrante.getStatus())) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("mensagem", "Seu convite para esta equipe já foi respondido."));
        }

        integrante.setStatus(aceitar ? "CONFIRMADO" : "RECUSADO");
        equipeRepository.save(equipe);

        convite.setConviteStatus(aceitar ? "ACEITO" : "RECUSADO");
        Mensagem salva = mensagemRepository.save(convite);

        messagingTemplate.convertAndSend("/topic/mensagens/" + salva.getDestinatarioId(), salva);
        messagingTemplate.convertAndSend("/topic/mensagens/" + salva.getRemetenteId(), salva);

        return ResponseEntity.ok(salva);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deletarMensagem(@PathVariable String id) {
        if (mensagemRepository.existsById(id)) {
            mensagemRepository.deleteById(id);
            return ResponseEntity.ok().build();
        }
        return ResponseEntity.notFound().build();
    }
}
