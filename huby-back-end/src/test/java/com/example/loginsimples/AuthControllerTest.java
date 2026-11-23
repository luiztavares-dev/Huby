package com.example.loginsimples;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthControllerTest {

    @Mock
    private UsuarioRepository repository;

    @Mock
    private ConteudoRepository conteudoRepository;

    @InjectMocks
    private AuthController controller;

    @Test
    void compraAdicionaJogoAsComprasEABiblioteca() {
        Usuario usuario = new Usuario();
        usuario.setId("usuario-1");

        Conteudo jogo = new Conteudo();
        jogo.setId("jogo-1");
        jogo.setTipo(TipoConteudo.JOGO);
        jogo.setPreco(12.90);

        when(repository.findById("usuario-1")).thenReturn(Optional.of(usuario));
        when(conteudoRepository.findById("jogo-1")).thenReturn(Optional.of(jogo));
        when(repository.save(usuario)).thenReturn(usuario);

        ResponseEntity<?> resposta = controller.comprarJogo("usuario-1", "jogo-1");

        assertEquals(HttpStatus.OK, resposta.getStatusCode());
        assertEquals(List.of("jogo-1"), usuario.getComprasIds());
        assertEquals(List.of("jogo-1"), usuario.getBibliotecaIds());
        verify(repository).save(usuario);
    }

    @Test
    void compraNaoDuplicaJogoExistente() {
        Usuario usuario = new Usuario();
        usuario.setComprasIds(List.of("jogo-1"));
        usuario.setBibliotecaIds(List.of("jogo-1"));

        Conteudo jogo = new Conteudo();
        jogo.setTipo(TipoConteudo.JOGO);
        jogo.setPreco(12.90);

        when(repository.findById("usuario-1")).thenReturn(Optional.of(usuario));
        when(conteudoRepository.findById("jogo-1")).thenReturn(Optional.of(jogo));
        when(repository.save(usuario)).thenReturn(usuario);

        controller.comprarJogo("usuario-1", "jogo-1");

        assertEquals(List.of("jogo-1"), usuario.getComprasIds());
        assertEquals(List.of("jogo-1"), usuario.getBibliotecaIds());
    }

    @Test
    void compraRejeitaJogoGratuito() {
        Usuario usuario = new Usuario();
        Conteudo jogo = new Conteudo();
        jogo.setTipo(TipoConteudo.JOGO);
        jogo.setPreco(0.0);

        when(repository.findById("usuario-1")).thenReturn(Optional.of(usuario));
        when(conteudoRepository.findById("jogo-1")).thenReturn(Optional.of(jogo));

        ResponseEntity<?> resposta = controller.comprarJogo("usuario-1", "jogo-1");

        assertEquals(HttpStatus.BAD_REQUEST, resposta.getStatusCode());
        verify(repository, never()).save(any(Usuario.class));
    }

    @Test
    void compraRejeitaJogoInexistente() {
        Usuario usuario = new Usuario();
        when(repository.findById("usuario-1")).thenReturn(Optional.of(usuario));
        when(conteudoRepository.findById("jogo-1")).thenReturn(Optional.empty());

        ResponseEntity<?> resposta = controller.comprarJogo("usuario-1", "jogo-1");

        assertEquals(HttpStatus.NOT_FOUND, resposta.getStatusCode());
        verify(repository, never()).save(any(Usuario.class));
    }

    @Test
    void buscarComprasRetornaListaDoUsuario() {
        Usuario usuario = new Usuario();
        usuario.setComprasIds(List.of("jogo-1", "jogo-2"));
        when(repository.findById("usuario-1")).thenReturn(Optional.of(usuario));

        ResponseEntity<List<String>> resposta = controller.buscarCompras("usuario-1");

        assertEquals(HttpStatus.OK, resposta.getStatusCode());
        assertEquals(List.of("jogo-1", "jogo-2"), resposta.getBody());
    }
}
