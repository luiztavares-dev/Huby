package com.example.loginsimples;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.server.ResponseStatusException;
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
    private ProcurandoEquipeRepository procurandoEquipeRepository;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    public record RespostaConviteDTO(String usuarioId) {
    }

    @PostMapping
    public ResponseEntity<Mensagem> enviarMensagem(@RequestBody Mensagem mensagem) {
        mensagem.setDataHora(LocalDateTime.now());
        mensagem.setTipo("TEXTO");
        mensagem.setOrigem("EQUIPE");
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
    @Transactional
    public ResponseEntity<?> aceitarPedido(@PathVariable String id,
                                           @RequestBody(required = false) RespostaConviteDTO dto) {
        return responderPedido(id, dto, true);
    }

    @PostMapping("/{id}/pedido/recusar")
    @Transactional
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
                    .body(Map.of("mensagem", "Você não pode responder a este pedido."));
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

        boolean perfilBusca = "PERFIL_BUSCA".equals(pedido.getOrigem());
        Usuario remetente = usuarioRepository.findById(pedido.getRemetenteId()).orElse(null);
        if (remetente == null || remetente.getId() == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("mensagem", "Usuário do pedido não encontrado."));
        }

        Equipe equipe = equipeOptional.get();
        String eventoId = pedido.getEventoId() == null ? "" : pedido.getEventoId();
        if (!eventoId.equals(equipe.getEventoId())) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("mensagem", "A equipe deste pedido pertence a outro evento."));
        }

        Usuario entrante = remetente;
        if (perfilBusca) {
            entrante = usuarioRepository.findById(pedido.getDestinatarioId()).orElse(null);
            if (entrante == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("mensagem", "Seu perfil não foi encontrado."));
            }
            if (!remetente.getId().equals(equipe.getLiderId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("mensagem", "Somente o líder desta equipe pode enviar este pedido."));
            }
            if (!"COMUM".equals(equipe.getModelo()) || !Boolean.TRUE.equals(equipe.getAbertaParaSolicitacoes())) {
                return ResponseEntity.status(HttpStatus.CONFLICT)
                        .body(Map.of("mensagem", "Esta equipe não está mais aceitando integrantes."));
            }
            if (procurandoEquipeRepository.findByEventoIdAndUsuarioId(
                    eventoId, entrante.getId()).isEmpty()) {
                return ResponseEntity.status(HttpStatus.CONFLICT)
                        .body(Map.of("mensagem", "Este perfil não está mais procurando equipe."));
            }
        }

        if (aceitar) {
            Conteudo evento = conteudoRepository.findById(eventoId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                            "Evento do pedido não encontrado."));
            PeriodoEvento.validarInscricoes(evento);
            if (Boolean.TRUE.equals(equipe.getAguardandoSorteio())) {
                return ResponseEntity.status(HttpStatus.CONFLICT)
                        .body(Map.of("mensagem", "Aguarde o sorteio das equipes surpresa."));
            }

            String username = entrante.getUsername() == null ? "" : entrante.getUsername();
            List<IntegranteEquipe> integrantes = equipe.getIntegrantes() == null
                    ? new ArrayList<>() : new ArrayList<>(equipe.getIntegrantes());

            IntegranteEquipe integranteAtivo = integrantes.stream()
                    .filter(item -> item != null && !"RECUSADO".equals(item.getStatus())
                            && item.getNomeUsuario() != null
                            && item.getNomeUsuario().equalsIgnoreCase(username))
                    .findFirst()
                    .orElse(null);

            IntegranteEquipe integrante = integranteAtivo;
            if (integrante == null) {
                integrante = integrantes.stream()
                        .filter(item -> item != null && "RECUSADO".equals(item.getStatus())
                                && item.getNomeUsuario() != null
                                && item.getNomeUsuario().equalsIgnoreCase(username))
                        .findFirst()
                        .orElse(null);
            }

            if (integranteAtivo == null) {
                int maximo = Math.max(2, evento.getTamanhoEquipe() != null
                        ? evento.getTamanhoEquipe() : 4);
                int total = (int) integrantes.stream()
                        .filter(item -> item != null && !"RECUSADO".equals(item.getStatus()))
                        .count();

                if (total >= maximo) {
                    return ResponseEntity.status(HttpStatus.CONFLICT)
                            .body(Map.of("mensagem", "A equipe já está completa."));
                }
            }

            if (participaDeOutraEquipe(eventoId, entrante, equipe.getId())) {
                return ResponseEntity.status(HttpStatus.CONFLICT)
                        .body(Map.of("mensagem", "Você já está inscrito em outra equipe deste evento."));
            }

            String avatar = entrante.getAvatarUrl() == null ? "" : entrante.getAvatarUrl().trim();
            if (integrante == null) {
                String funcao = perfilBusca && pedido.getFuncao() != null && !pedido.getFuncao().isBlank()
                        ? pedido.getFuncao() : "A definir";
                integrante = new IntegranteEquipe(username, funcao, avatar);
                integrantes.add(integrante);
            } else {
                if (perfilBusca && pedido.getFuncao() != null && !pedido.getFuncao().isBlank()) {
                    integrante.setFuncao(pedido.getFuncao());
                }
                integrante.setAvatar(avatar);
            }

            integrante.setStatus("CONFIRMADO");
            equipe.setIntegrantes(integrantes);
            equipeRepository.save(equipe);

            procurandoEquipeRepository.deleteByEventoIdAndUsuarioId(eventoId, entrante.getId());
            cancelarPedidosPerfil(eventoId, entrante.getId(), pedido.getId());
        }

        pedido.setConviteStatus(aceitar ? "ACEITO" : "RECUSADO");
        Mensagem salva = mensagemRepository.save(pedido);
        notificarMensagem(salva);

        return ResponseEntity.ok(salva);
    }

    private List<IntegranteEquipe> integrantesAtivos(Equipe equipe) {
        if (equipe.getIntegrantes() == null) return List.of();
        return equipe.getIntegrantes().stream()
                .filter(integrante -> integrante != null && !"RECUSADO".equals(integrante.getStatus()))
                .toList();
    }

    private boolean participaDeOutraEquipe(String eventoId, Usuario usuario, String equipeId) {
        String username = usuario.getUsername() == null ? "" : usuario.getUsername();
        return equipeRepository.findByEventoIdOrderByCriadoEmDesc(eventoId).stream()
                .anyMatch(equipe -> !equipeId.equals(equipe.getId())
                        && (usuario.getId().equals(equipe.getLiderId())
                                || integrantesAtivos(equipe).stream()
                                        .anyMatch(item -> item.getNomeUsuario() != null
                                                && item.getNomeUsuario().equalsIgnoreCase(username))));
    }

    private void notificarMensagem(Mensagem mensagem) {
        Runnable envio = () -> {
            messagingTemplate.convertAndSend("/topic/mensagens/" + mensagem.getDestinatarioId(), mensagem);
            messagingTemplate.convertAndSend("/topic/mensagens/" + mensagem.getRemetenteId(), mensagem);
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

    private void cancelarPedidosPerfil(String eventoId, String usuarioId, String idExcluido) {
        List<Mensagem> pedidos = mensagemRepository
                .findByDestinatarioIdAndEventoIdAndTipoAndOrigemAndConviteStatus(
                        usuarioId, eventoId, "PEDIDO_EQUIPE", "PERFIL_BUSCA", "PENDENTE");
        for (Mensagem pedido : pedidos) {
            if (idExcluido != null && idExcluido.equals(pedido.getId())) continue;
            pedido.setConviteStatus("RECUSADO");
            Mensagem salva = mensagemRepository.save(pedido);
            notificarMensagem(salva);
        }
    }

    @PostMapping("/{id}/convite/aceitar")
    @Transactional
    public ResponseEntity<?> aceitarConvite(@PathVariable String id,
                                            @RequestBody(required = false) RespostaConviteDTO dto) {
        return responderConvite(id, dto, true);
    }

    @PostMapping("/{id}/convite/recusar")
    @Transactional
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

        Equipe equipe = equipeOptional.get();
        String eventoId = convite.getEventoId() == null ? "" : convite.getEventoId();
        if (!eventoId.equals(equipe.getEventoId())) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("mensagem", "A equipe deste convite pertence a outro evento."));
        }

        Usuario convidado = usuarioRepository.findById(dto.usuarioId()).orElse(null);
        if (convidado == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("mensagem", "Usuário do convite não encontrado."));
        }

        String username = convidado.getUsername() == null ? "" : convidado.getUsername();
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

        if (aceitar) {
            Conteudo evento = conteudoRepository.findById(eventoId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                            "Evento do convite não encontrado."));
            PeriodoEvento.validarInscricoes(evento);
            if (Boolean.TRUE.equals(equipe.getAguardandoSorteio())) {
                return ResponseEntity.status(HttpStatus.CONFLICT)
                        .body(Map.of("mensagem", "Aguarde o sorteio das equipes surpresa."));
            }
            if (participaDeOutraEquipe(eventoId, convidado, equipe.getId())) {
                return ResponseEntity.status(HttpStatus.CONFLICT)
                        .body(Map.of("mensagem", "Você já está inscrito em outra equipe deste evento."));
            }
        }

        integrante.setStatus(aceitar ? "CONFIRMADO" : "RECUSADO");
        equipeRepository.save(equipe);

        if (aceitar) {
            procurandoEquipeRepository.deleteByEventoIdAndUsuarioId(eventoId, convidado.getId());
            cancelarPedidosPerfil(eventoId, convidado.getId(), null);
        }

        convite.setConviteStatus(aceitar ? "ACEITO" : "RECUSADO");
        Mensagem salva = mensagemRepository.save(convite);
        notificarMensagem(salva);

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
