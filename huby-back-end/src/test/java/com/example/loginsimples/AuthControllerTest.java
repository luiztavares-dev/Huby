package com.example.loginsimples;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.Set;

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

    @Mock
    private EquipeRepository equipeRepository;

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

    @Test
    void atividadesRetornaAutoriaESomenteParticipacoesConfirmadasEmJams() {
        Usuario usuario = new Usuario();
        usuario.setId("usuario-1");
        usuario.setUsername("dev");
        when(repository.findById("usuario-1")).thenReturn(Optional.of(usuario));

        Conteudo evento = conteudo("evento-1", TipoConteudo.EVENTO);
        Conteudo jogo = conteudo("jogo-1", TipoConteudo.JOGO);
        Conteudo jamRecente = conteudo("jam-recente", TipoConteudo.GAME_JAM);
        jamRecente.setDataInicio(LocalDate.of(2026, 11, 20));
        Conteudo jamAntiga = conteudo("jam-antiga", TipoConteudo.GAME_JAM);
        jamAntiga.setDataInicio(LocalDate.of(2026, 11, 10));

        when(conteudoRepository.findByCriadorIdAndTipoInOrderByDataPublicacaoDesc(
                "usuario-1", List.of(TipoConteudo.EVENTO, TipoConteudo.GAME_JAM)))
                .thenReturn(List.of(evento));
        when(conteudoRepository.findByCriadorIdAndTipoOrderByDataPublicacaoDesc(
                "usuario-1", TipoConteudo.JOGO))
                .thenReturn(List.of(jogo));

        Equipe equipeLider = new Equipe();
        equipeLider.setEventoId("jam-recente");
        equipeLider.setLiderId("usuario-1");

        Equipe equipeConfirmada = equipeComIntegrante("jam-antiga", "CONFIRMADO");
        Equipe equipePendente = equipeComIntegrante("jam-pendente", "PENDENTE");
        Equipe equipeEvento = equipeComIntegrante("evento-1", "CONFIRMADO");

        when(equipeRepository.findByLiderId("usuario-1")).thenReturn(List.of(equipeLider));
        when(equipeRepository.findByIntegrantesNomeUsuarioIgnoreCase("dev"))
                .thenReturn(List.of(equipeConfirmada, equipePendente, equipeEvento));
        when(conteudoRepository.findAllById(any())).thenAnswer(invocation -> {
            Set<String> ids = invocation.getArgument(0);
            return List.of(jamAntiga, jamRecente, evento).stream()
                    .filter(conteudo -> ids.contains(conteudo.getId()))
                    .toList();
        });

        ResponseEntity<?> resposta = controller.buscarAtividades("usuario-1");

        assertEquals(HttpStatus.OK, resposta.getStatusCode());
        AuthController.AtividadesPerfilDTO dados = (AuthController.AtividadesPerfilDTO) resposta.getBody();
        assertEquals(List.of(evento), dados.criados());
        assertEquals(List.of(jogo), dados.publicados());
        assertEquals(List.of(jamRecente, jamAntiga), dados.participados());
    }

    private Conteudo conteudo(String id, TipoConteudo tipo) {
        Conteudo conteudo = new Conteudo();
        conteudo.setId(id);
        conteudo.setTipo(tipo);
        return conteudo;
    }

    private Equipe equipeComIntegrante(String eventoId, String status) {
        IntegranteEquipe integrante = new IntegranteEquipe("DEV", "Programação");
        integrante.setStatus(status);
        Equipe equipe = new Equipe();
        equipe.setEventoId(eventoId);
        equipe.setIntegrantes(List.of(integrante));
        return equipe;
    }
}
