package com.example.loginsimples;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ComunidadesControllerTest {

    @Mock
    private ConteudoRepository conteudoRepository;

    @Mock
    private UsuarioRepository usuarioRepository;

    @InjectMocks
    private ComunidadesController controller;

    @Test
    void criarCadastraCriadorComoDono() {
        Usuario usuario = usuario();
        when(usuarioRepository.findById("usuario-1")).thenReturn(Optional.of(usuario));
        when(conteudoRepository.findByTipoOrderByRelevanciaDescNotaDesc(TipoConteudo.COMUNIDADE))
                .thenReturn(List.of());
        when(conteudoRepository.save(any(Conteudo.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var dados = new ComunidadesController.CriarDTO(
                "usuario-1", " Criadores indie ", " Um espaço para compartilhar projetos. ", null, false);

        Conteudo comunidade = controller.criar(dados);

        assertEquals(TipoConteudo.COMUNIDADE, comunidade.getTipo());
        assertEquals("Criadores indie", comunidade.getTitulo());
        assertEquals("Um espaço para compartilhar projetos.", comunidade.getDescricao());
        assertEquals("/icon-perfil.png", comunidade.getImagem());
        assertEquals("usuario-1", comunidade.getDonoId());
        assertEquals(1, comunidade.getParticipantes());
        assertFalse(comunidade.getAbertaParaSolicitacoes());
        assertEquals(1, comunidade.getMembros().size());
        assertEquals("usuario-1", comunidade.getMembros().getFirst().getUsuarioId());
        assertEquals("DONO", comunidade.getMembros().getFirst().getCargo());
        assertTrue(comunidade.getSolicitacoes().isEmpty());
        verify(conteudoRepository).save(comunidade);
    }

    @Test
    void criarRejeitaNomeJaUtilizado() {
        when(usuarioRepository.findById("usuario-1")).thenReturn(Optional.of(usuario()));
        Conteudo existente = new Conteudo();
        existente.setId("comunidade-1");
        existente.setTitulo("Criadores indie");
        when(conteudoRepository.findByTipoOrderByRelevanciaDescNotaDesc(TipoConteudo.COMUNIDADE))
                .thenReturn(List.of(existente));

        var dados = new ComunidadesController.CriarDTO(
                "usuario-1", "criadores INDIE", "Um espaço para compartilhar projetos.", null, true);

        ResponseStatusException erro = assertThrows(ResponseStatusException.class, () -> controller.criar(dados));

        assertEquals(HttpStatus.CONFLICT, erro.getStatusCode());
        verify(conteudoRepository, never()).save(any(Conteudo.class));
    }

    @Test
    void criarRejeitaNomeCurto() {
        when(usuarioRepository.findById("usuario-1")).thenReturn(Optional.of(usuario()));
        var dados = new ComunidadesController.CriarDTO(
                "usuario-1", "ab", "Um espaço para compartilhar projetos.", null, true);

        ResponseStatusException erro = assertThrows(ResponseStatusException.class, () -> controller.criar(dados));

        assertEquals(HttpStatus.BAD_REQUEST, erro.getStatusCode());
        verify(conteudoRepository, never()).save(any(Conteudo.class));
    }

    @Test
    void criarRejeitaDescricaoCurta() {
        when(usuarioRepository.findById("usuario-1")).thenReturn(Optional.of(usuario()));
        when(conteudoRepository.findByTipoOrderByRelevanciaDescNotaDesc(TipoConteudo.COMUNIDADE))
                .thenReturn(List.of());
        var dados = new ComunidadesController.CriarDTO(
                "usuario-1", "Criadores indie", "Curta", null, true);

        ResponseStatusException erro = assertThrows(ResponseStatusException.class, () -> controller.criar(dados));

        assertEquals(HttpStatus.BAD_REQUEST, erro.getStatusCode());
        verify(conteudoRepository, never()).save(any(Conteudo.class));
    }

    @Test
    void criarAceitaUrlExterna() {
        when(usuarioRepository.findById("usuario-1")).thenReturn(Optional.of(usuario()));
        when(conteudoRepository.findByTipoOrderByRelevanciaDescNotaDesc(TipoConteudo.COMUNIDADE))
                .thenReturn(List.of());
        when(conteudoRepository.save(any(Conteudo.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var dados = new ComunidadesController.CriarDTO(
                "usuario-1", "Criadores indie", "Um espaço para compartilhar projetos.",
                "https://images.example.com/capa.png", true);

        Conteudo comunidade = controller.criar(dados);

        assertEquals("https://images.example.com/capa.png", comunidade.getImagem());
    }

    @Test
    void criarRejeitaImagemComProtocoloInvalido() {
        when(usuarioRepository.findById("usuario-1")).thenReturn(Optional.of(usuario()));
        when(conteudoRepository.findByTipoOrderByRelevanciaDescNotaDesc(TipoConteudo.COMUNIDADE))
                .thenReturn(List.of());

        var dados = new ComunidadesController.CriarDTO(
                "usuario-1", "Criadores indie", "Um espaço para compartilhar projetos.",
                "javascript:alert(1)", true);

        ResponseStatusException erro = assertThrows(ResponseStatusException.class, () -> controller.criar(dados));

        assertEquals(HttpStatus.BAD_REQUEST, erro.getStatusCode());
        verify(conteudoRepository, never()).save(any(Conteudo.class));
    }

    @Test
    void configurarAceitaUrlExterna() {
        Conteudo comunidade = new Conteudo();
        comunidade.setId("comunidade-1");
        comunidade.setTipo(TipoConteudo.COMUNIDADE);
        comunidade.setTitulo("Criadores indie");
        comunidade.setImagem("/icon-perfil.png");
        comunidade.setMembros(new ArrayList<>(List.of(
                new IntegranteComunidade("usuario-1", "criador", null, "DONO"))));
        when(conteudoRepository.findById("comunidade-1")).thenReturn(Optional.of(comunidade));
        when(usuarioRepository.findById("usuario-1")).thenReturn(Optional.of(usuario()));
        when(conteudoRepository.save(any(Conteudo.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var dados = new ComunidadesController.ConfigDTO(
                "usuario-1", "Criadores indie", "https://images.example.com/nova-capa.png", true);

        Conteudo atualizada = controller.configurar("comunidade-1", dados);

        assertEquals("https://images.example.com/nova-capa.png", atualizada.getImagem());
    }

    private Usuario usuario() {
        Usuario usuario = new Usuario();
        usuario.setId("usuario-1");
        usuario.setUsername("criador");
        usuario.setNomeExibicao("Criador");
        return usuario;
    }
}
