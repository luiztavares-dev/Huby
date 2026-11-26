package com.example.loginsimples;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class JogosControllerTest {

    @Mock
    private ConteudoRepository conteudoRepository;

    @Mock
    private UsuarioRepository usuarioRepository;

    @InjectMocks
    private JogosController controller;

    @Test
    void publicarCriaJogoComCamposNormalizados() {
        Usuario usuario = new Usuario();
        usuario.setId("usuario-1");
        usuario.setNomeExibicao("João");
        when(usuarioRepository.findById("usuario-1")).thenReturn(Optional.of(usuario));
        when(conteudoRepository.save(any(Conteudo.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var dados = new JogosController.PublicarJogoDTO(
                "usuario-1", " Jogo de teste ", " Uma descrição válida para o jogo. ", null,
                "", "https://imagem.test/capa.jpg", List.of(new MidiaConteudo("IMAGE", " https://imagem.test/capa.jpg ")),
                "https://jogo.test", List.of(" Puzzle ", "puzzle"), List.of("WEBSITE", "pc"), 12.90
        );

        Conteudo jogo = controller.publicar(dados);

        assertEquals(TipoConteudo.JOGO, jogo.getTipo());
        assertEquals("Jogo de teste", jogo.getTitulo());
        assertEquals("Uma descrição válida para o jogo.", jogo.getDescricaoLonga());
        assertEquals("João", jogo.getDesenvolvedor());
        var midia = jogo.getMidias().get(0);
        assertEquals("image", midia.getTipo());
        assertEquals("https://imagem.test/capa.jpg", midia.getUrl());
        assertEquals(List.of("Puzzle"), jogo.getTags());
        assertEquals(List.of("website", "pc"), jogo.getPlataformas());
        assertEquals(12.90, jogo.getPreco());
        assertEquals("usuario-1", jogo.getCriadorId());
        assertFalse(jogo.getDestaque());
        verify(conteudoRepository).save(jogo);
    }

    @Test
    void publicarRejeitaTituloCurto() {
        var dados = new JogosController.PublicarJogoDTO(
                "usuario-1", "ab", "Descrição válida", null, "", "", List.of(), "https://jogo.test",
                List.of(), List.of("pc"), 0.0
        );

        ResponseStatusException erro = assertThrows(ResponseStatusException.class, () -> controller.publicar(dados));

        assertEquals(HttpStatus.BAD_REQUEST, erro.getStatusCode());
        verify(conteudoRepository, never()).save(any(Conteudo.class));
    }

    @Test
    void publicarRejeitaUsuarioInexistente() {
        when(usuarioRepository.findById("usuario-1")).thenReturn(Optional.empty());
        var dados = new JogosController.PublicarJogoDTO(
                "usuario-1", "Jogo válido", "Descrição válida", null, "", "", List.of(), "https://jogo.test",
                List.of(), List.of("pc"), 0.0
        );

        ResponseStatusException erro = assertThrows(ResponseStatusException.class, () -> controller.publicar(dados));

        assertEquals(HttpStatus.NOT_FOUND, erro.getStatusCode());
        verify(conteudoRepository, never()).save(any(Conteudo.class));
    }

    @Test
    void publicarRejeitaLinkInvalido() {
        Usuario usuario = new Usuario();
        usuario.setId("usuario-1");
        when(usuarioRepository.findById("usuario-1")).thenReturn(Optional.of(usuario));
        var dados = new JogosController.PublicarJogoDTO(
                "usuario-1", "Jogo válido", "Descrição válida", null, "", "", List.of(), "javascript:alert(1)",
                List.of(), List.of("pc"), 0.0
        );

        ResponseStatusException erro = assertThrows(ResponseStatusException.class, () -> controller.publicar(dados));

        assertEquals(HttpStatus.BAD_REQUEST, erro.getStatusCode());
        verify(conteudoRepository, never()).save(any(Conteudo.class));
    }

    @Test
    void publicarRejeitaPrecoNegativo() {
        Usuario usuario = new Usuario();
        usuario.setId("usuario-1");
        when(usuarioRepository.findById("usuario-1")).thenReturn(Optional.of(usuario));
        var dados = new JogosController.PublicarJogoDTO(
                "usuario-1", "Jogo válido", "Descrição válida", null, "", "", List.of(), "https://jogo.test",
                List.of(), List.of("pc"), -1.0
        );

        ResponseStatusException erro = assertThrows(ResponseStatusException.class, () -> controller.publicar(dados));

        assertEquals(HttpStatus.BAD_REQUEST, erro.getStatusCode());
        verify(conteudoRepository, never()).save(any(Conteudo.class));
    }

    @Test
    void publicarRejeitaSemPlataforma() {
        Usuario usuario = new Usuario();
        usuario.setId("usuario-1");
        when(usuarioRepository.findById("usuario-1")).thenReturn(Optional.of(usuario));
        var dados = new JogosController.PublicarJogoDTO(
                "usuario-1", "Jogo válido", "Descrição válida", null, "", "", List.of(), "https://jogo.test",
                List.of(), List.of(), 0.0
        );

        ResponseStatusException erro = assertThrows(ResponseStatusException.class, () -> controller.publicar(dados));

        assertEquals(HttpStatus.BAD_REQUEST, erro.getStatusCode());
        verify(conteudoRepository, never()).save(any(Conteudo.class));
    }
}
