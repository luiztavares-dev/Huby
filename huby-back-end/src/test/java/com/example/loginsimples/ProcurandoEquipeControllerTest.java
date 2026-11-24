package com.example.loginsimples;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProcurandoEquipeControllerTest {

    @Mock
    private ConteudoRepository conteudoRepository;
    @Mock
    private ProcurandoEquipeRepository procurandoEquipeRepository;
    @Mock
    private FuncaoEquipeRepository funcaoRepository;
    @Mock
    private UsuarioRepository usuarioRepository;
    @Mock
    private EquipeRepository equipeRepository;
    @Mock
    private MensagemRepository mensagemRepository;
    @Mock
    private SimpMessagingTemplate messagingTemplate;

    @InjectMocks
    private ProcurandoEquipeController controller;

    @Test
    void salvaPerfilComDadosPublicosDoUsuario() {
        Conteudo evento = evento();
        Usuario usuario = usuario("usuario-1", "candidata", "Ana");
        usuario.setAvatarUrl("avatar.png");
        usuario.setBannerUrl("banner.png");

        when(conteudoRepository.findById("evento-1")).thenReturn(Optional.of(evento));
        when(usuarioRepository.findById("usuario-1")).thenReturn(Optional.of(usuario));
        when(equipeRepository.findByEventoIdOrderByCriadoEmDesc("evento-1")).thenReturn(List.of());
        when(funcaoRepository.findByNomeIgnoreCase("Arte")).thenReturn(Optional.of(new FuncaoEquipe()));
        when(procurandoEquipeRepository.findByEventoIdAndUsuarioId("evento-1", "usuario-1"))
                .thenReturn(Optional.empty());
        when(procurandoEquipeRepository.save(any(ProcurandoEquipe.class))).thenAnswer(invocation -> {
            ProcurandoEquipe salvo = invocation.getArgument(0);
            salvo.setId("perfil-1");
            return salvo;
        });

        ProcurandoEquipeController.PerfilProcurandoEquipeDTO resposta = controller.salvar(
                "evento-1",
                new ProcurandoEquipeController.SalvarProcurandoEquipeDTO(
                        "usuario-1", "Arte", "Desenho cenarios e personagens."));

        assertEquals("perfil-1", resposta.id());
        assertEquals("Ana", resposta.nomeExibicao());
        assertEquals("candidata", resposta.username());
        assertEquals("avatar.png", resposta.avatarUrl());
        assertEquals("banner.png", resposta.bannerUrl());
        assertEquals("Arte", resposta.funcao());
        assertNotNull(resposta.criadoEm());
        assertNotNull(resposta.atualizadoEm());
        verify(procurandoEquipeRepository).save(any(ProcurandoEquipe.class));
    }

    @Test
    void salvarRejeitaQuemJaEstaEmUmaEquipe() {
        Conteudo evento = evento();
        Usuario usuario = usuario("usuario-1", "candidata", "Ana");
        Equipe equipe = equipe("equipe-1", "lider-1");
        equipe.setIntegrantes(List.of(new IntegranteEquipe("candidata", "Arte", "")));

        when(conteudoRepository.findById("evento-1")).thenReturn(Optional.of(evento));
        when(usuarioRepository.findById("usuario-1")).thenReturn(Optional.of(usuario));
        when(equipeRepository.findByEventoIdOrderByCriadoEmDesc("evento-1")).thenReturn(List.of(equipe));

        ResponseStatusException erro = assertThrows(ResponseStatusException.class, () -> controller.salvar(
                "evento-1",
                new ProcurandoEquipeController.SalvarProcurandoEquipeDTO(
                        "usuario-1", "Arte", "Desenho cenarios e personagens.")));

        assertEquals(HttpStatus.CONFLICT, erro.getStatusCode());
        verify(procurandoEquipeRepository, never()).save(any());
    }

    @Test
    void listaSomentePerfisDeQuemAindaNaoTemEquipe() {
        Conteudo evento = evento();
        ProcurandoEquipe disponivel = perfil("perfil-1", "evento-1", "usuario-1");
        ProcurandoEquipe inscrito = perfil("perfil-2", "evento-1", "usuario-2");
        Usuario usuario1 = usuario("usuario-1", "disponivel", "Ana");
        Usuario usuario2 = usuario("usuario-2", "inscrito", "Bia");
        Equipe equipe = equipe("equipe-1", "lider-1");
        equipe.setIntegrantes(List.of(new IntegranteEquipe("inscrito", "Programação", "")));

        when(conteudoRepository.findById("evento-1")).thenReturn(Optional.of(evento));
        when(procurandoEquipeRepository.findByEventoIdOrderByAtualizadoEmDesc("evento-1"))
                .thenReturn(List.of(disponivel, inscrito));
        when(usuarioRepository.findById("usuario-1")).thenReturn(Optional.of(usuario1));
        when(usuarioRepository.findById("usuario-2")).thenReturn(Optional.of(usuario2));
        when(equipeRepository.findByEventoIdOrderByCriadoEmDesc("evento-1")).thenReturn(List.of(equipe));

        List<ProcurandoEquipeController.PerfilProcurandoEquipeDTO> resposta = controller.listar("evento-1");

        assertEquals(1, resposta.size());
        assertEquals("perfil-1", resposta.get(0).id());
    }

    @Test
    void removerPerfilCancelaPedidosPendentes() {
        ProcurandoEquipe perfil = perfil("perfil-1", "evento-1", "usuario-1");
        Mensagem pedido = new Mensagem();
        pedido.setId("pedido-1");
        pedido.setDestinatarioId("usuario-1");
        pedido.setRemetenteId("lider-1");
        pedido.setConviteStatus("PENDENTE");

        when(conteudoRepository.findById("evento-1")).thenReturn(Optional.of(evento()));
        when(procurandoEquipeRepository.findByEventoIdAndUsuarioId("evento-1", "usuario-1"))
                .thenReturn(Optional.of(perfil));
        when(mensagemRepository.findByDestinatarioIdAndEventoIdAndTipoAndOrigemAndConviteStatus(
                "usuario-1", "evento-1", "PEDIDO_EQUIPE", "PERFIL_BUSCA", "PENDENTE"))
                .thenReturn(List.of(pedido));
        when(mensagemRepository.save(pedido)).thenReturn(pedido);

        controller.remover("evento-1", "usuario-1");

        verify(procurandoEquipeRepository).delete(perfil);
        assertEquals("RECUSADO", pedido.getConviteStatus());
        verify(messagingTemplate).convertAndSend("/topic/mensagens/usuario-1", pedido);
        verify(messagingTemplate).convertAndSend("/topic/mensagens/lider-1", pedido);
    }

    @Test
    void liderEnviaPedidoParaPerfilComOrigemInvertida() {
        Conteudo evento = evento();
        Usuario lider = usuario("lider-1", "lider", "Líder");
        Usuario candidato = usuario("usuario-1", "candidata", "Ana");
        ProcurandoEquipe perfil = perfil("perfil-1", "evento-1", "usuario-1");
        perfil.setFuncao("Arte");
        Equipe equipe = equipe("equipe-1", "lider-1");
        equipe.setAbertaParaSolicitacoes(true);
        equipe.setIntegrantes(List.of(new IntegranteEquipe("lider", "Programação", "")));

        when(conteudoRepository.findById("evento-1")).thenReturn(Optional.of(evento));
        when(usuarioRepository.findById("lider-1")).thenReturn(Optional.of(lider));
        when(procurandoEquipeRepository.findById("perfil-1")).thenReturn(Optional.of(perfil));
        when(usuarioRepository.findById("usuario-1")).thenReturn(Optional.of(candidato));
        when(equipeRepository.findByEventoIdOrderByCriadoEmDesc("evento-1")).thenReturn(List.of(equipe));
        when(equipeRepository.findById("equipe-1")).thenReturn(Optional.of(equipe));
        when(mensagemRepository.existsByEquipeIdAndRemetenteIdAndDestinatarioIdAndTipoAndOrigemAndConviteStatus(
                "equipe-1", "lider-1", "usuario-1", "PEDIDO_EQUIPE", "PERFIL_BUSCA", "PENDENTE"))
                .thenReturn(false);
        when(mensagemRepository.save(any(Mensagem.class))).thenAnswer(invocation -> {
            Mensagem salva = invocation.getArgument(0);
            salva.setId("pedido-1");
            return salva;
        });

        Mensagem resposta = controller.enviarPedido(
                "evento-1", "perfil-1",
                new ProcurandoEquipeController.PedidoPerfilDTO("lider-1", "equipe-1"));

        assertEquals("lider-1", resposta.getRemetenteId());
        assertEquals("usuario-1", resposta.getDestinatarioId());
        assertEquals("PEDIDO_EQUIPE", resposta.getTipo());
        assertEquals("PERFIL_BUSCA", resposta.getOrigem());
        assertEquals("Arte", resposta.getFuncao());
        assertEquals("PENDENTE", resposta.getConviteStatus());
        verify(messagingTemplate).convertAndSend("/topic/mensagens/usuario-1", resposta);
        verify(messagingTemplate).convertAndSend("/topic/mensagens/lider-1", resposta);
    }

    @Test
    void pedidoDoPerfilSomentePodeSerEnviadoPeloLider() {
        Conteudo evento = evento();
        Usuario remetente = usuario("outro-1", "outro", "Outro");
        Usuario candidato = usuario("usuario-1", "candidata", "Ana");
        ProcurandoEquipe perfil = perfil("perfil-1", "evento-1", "usuario-1");
        Equipe equipe = equipe("equipe-1", "lider-1");
        equipe.setAbertaParaSolicitacoes(true);
        equipe.setIntegrantes(List.of(new IntegranteEquipe("lider", "Programação", "")));

        when(conteudoRepository.findById("evento-1")).thenReturn(Optional.of(evento));
        when(usuarioRepository.findById("outro-1")).thenReturn(Optional.of(remetente));
        when(procurandoEquipeRepository.findById("perfil-1")).thenReturn(Optional.of(perfil));
        when(usuarioRepository.findById("usuario-1")).thenReturn(Optional.of(candidato));
        when(equipeRepository.findByEventoIdOrderByCriadoEmDesc("evento-1")).thenReturn(List.of(equipe));
        when(equipeRepository.findById("equipe-1")).thenReturn(Optional.of(equipe));

        ResponseStatusException erro = assertThrows(ResponseStatusException.class, () -> controller.enviarPedido(
                "evento-1", "perfil-1",
                new ProcurandoEquipeController.PedidoPerfilDTO("outro-1", "equipe-1")));

        assertEquals(HttpStatus.FORBIDDEN, erro.getStatusCode());
        verify(mensagemRepository, never()).save(any());
    }

    private Conteudo evento() {
        Conteudo evento = new Conteudo();
        evento.setId("evento-1");
        evento.setTipo(TipoConteudo.GAME_JAM);
        evento.setModeloEquipe("COMUM");
        evento.setTitulo("Game Jam New Games");
        evento.setTamanhoEquipe(4);
        evento.setInscricoesAte(LocalDate.now().plusDays(10));
        evento.setDataInicio(LocalDate.now().plusDays(20));
        return evento;
    }

    private Usuario usuario(String id, String username, String nome) {
        Usuario usuario = new Usuario();
        usuario.setId(id);
        usuario.setUsername(username);
        usuario.setNomeExibicao(nome);
        return usuario;
    }

    private ProcurandoEquipe perfil(String id, String eventoId, String usuarioId) {
        ProcurandoEquipe perfil = new ProcurandoEquipe();
        perfil.setId(id);
        perfil.setEventoId(eventoId);
        perfil.setUsuarioId(usuarioId);
        perfil.setFuncao("Arte");
        perfil.setDescricao("Desenho cenarios e personagens.");
        return perfil;
    }

    private Equipe equipe(String id, String liderId) {
        Equipe equipe = new Equipe();
        equipe.setId(id);
        equipe.setEventoId("evento-1");
        equipe.setNome("Equipe Teste");
        equipe.setLiderId(liderId);
        equipe.setModelo("COMUM");
        return equipe;
    }
}
