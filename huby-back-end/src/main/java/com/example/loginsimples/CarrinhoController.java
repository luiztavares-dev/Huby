package com.example.loginsimples;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/api/carrinho")
@CrossOrigin(origins = "*")
public class CarrinhoController {

    @Autowired
    private CarrinhoRepository carrinhoRepository;

    @Autowired
    private ConteudoRepository conteudoRepository;

 
    @GetMapping("/{usuarioId}")
    public List<Conteudo> listarCarrinho(@PathVariable String usuarioId) {
        Carrinho carrinho = carrinhoRepository.findByUsuarioId(usuarioId)
                .orElseGet(() -> new Carrinho(usuarioId));

        List<Conteudo> jogos = new ArrayList<>();
        for (String jogoId : carrinho.getJogosIds()) {
            conteudoRepository.findById(jogoId).ifPresent(jogos::add);
        }
        return jogos;
    }


    @PostMapping("/{usuarioId}/adicionar/{jogoId}")
    public ResponseEntity<List<Conteudo>> adicionarJogo(
            @PathVariable String usuarioId,
            @PathVariable String jogoId) {

        if (!conteudoRepository.existsById(jogoId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Jogo não encontrado.");
        }

        Carrinho carrinho = carrinhoRepository.findByUsuarioId(usuarioId)
                .orElseGet(() -> new Carrinho(usuarioId));

        if (!carrinho.getJogosIds().contains(jogoId)) {
            carrinho.getJogosIds().add(jogoId);
            carrinhoRepository.save(carrinho);
        }

        return ResponseEntity.ok(listarCarrinho(usuarioId));
    }

    // 3. Remover um jogo específico do carrinho
    @DeleteMapping("/{usuarioId}/remover/{jogoId}")
    public ResponseEntity<List<Conteudo>> removerJogo(
            @PathVariable String usuarioId,
            @PathVariable String jogoId) {

        carrinhoRepository.findByUsuarioId(usuarioId).ifPresent(carrinho -> {
            carrinho.getJogosIds().remove(jogoId);
            carrinhoRepository.save(carrinho);
        });

        return ResponseEntity.ok(listarCarrinho(usuarioId));
    }

   
    @DeleteMapping("/{usuarioId}/limpar")
    public ResponseEntity<Void> limparCarrinho(@PathVariable String usuarioId) {
        carrinhoRepository.findByUsuarioId(usuarioId).ifPresent(carrinho -> {
            carrinho.getJogosIds().clear();
            carrinhoRepository.save(carrinho);
        });
        return ResponseEntity.ok().build();
    }
}