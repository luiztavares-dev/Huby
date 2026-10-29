package com.example.loginsimples;

import org.springframework.beans.factory.annotation.Autowired;
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
    private SimpMessagingTemplate messagingTemplate;

    @PostMapping
    public ResponseEntity<Mensagem> enviarMensagem(@RequestBody Mensagem mensagem) {
        mensagem.setDataHora(LocalDateTime.now());
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
    public ResponseEntity<List<Usuario>> buscarContatos(@PathVariable String meuId) {
        List<Mensagem> minhasMensagens = mensagemRepository.findMinhasMensagens(meuId);
        
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

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deletarMensagem(@PathVariable String id) {
        if (mensagemRepository.existsById(id)) {
            mensagemRepository.deleteById(id);
            return ResponseEntity.ok().build();
        }
        return ResponseEntity.notFound().build();
    }
}
