package com.example.loginsimples;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MensagemControllerTest {

    @Mock
    private MensagemRepository mensagemRepository;
    @Mock
    private UsuarioRepository usuarioRepository;
    @Mock
    private EquipeRepository equipeRepository;
    @Mock
    private ConteudoRepository conteudoRepository;
    @Mock
    private ProcurandoEquipeRepository procurandoEquipeRepository;
    @Mock
    private SimpMessagingTemplate messagingTemplate;

    @InjectMocks
    private MensagemController controller;

    @Test
    void aceitarPedidoDoPerfilAdicionaODestinatarioNaEquipeDoLider() {
        Mensagem pedido = pedido("PERFIL_BUSCA", "lider-1", "candidata-1");
        pedido.setFuncao("Arte");
        Equipe equipe = equipe();
        Usuario lider = usuario("lider-1", "lider");
        Usuario candidata = usuario("candidata-1", "candidata");
        ProcurandoEquipe perfil = new ProcurandoEquipe();
        perfil.setEventoId("evento-1");
        perfil.setUsuarioId("candidata-1");

        when(mensagemRepository.findById("pedido-1")).thenReturn(Optional.of(pedido));
        when(equipeRepository.findById("equipe-1")).thenReturn(Optional.of(equipe));
        when(usuarioRepository.findById("lider-1")).thenReturn(Optional.of(lider));
        when(usuarioRepository.findById("candidata-1")).thenReturn(Optional.of(candidata));
        when(procurandoEquipeRepository.findByEventoIdAndUsuarioId("evento-1", "candidata-1"))
                .thenReturn(Optional.of(perfil));
        Conteudo evento = evento();
        evento.setTamanhoEquipe(2);
        when(conteudoRepository.findById("evento-1")).thenReturn(Optional.of(evento));
        when(equipeRepository.findByEventoIdOrderByCriadoEmDesc("evento-1")).thenReturn(List.of(equipe));
        when(mensagemRepository.findByDestinatarioIdAndEventoIdAndTipoAndOrigemAndConviteStatus(
                "candidata-1", "evento-1", "PEDIDO_EQUIPE", "PERFIL_BUSCA", "PENDENTE"))
                .thenReturn(List.of(pedido));
        when(mensagemRepository.save(pedido)).thenReturn(pedido);

        ResponseEntity<?> resposta = controller.aceitarPedido(
                "pedido-1", new MensagemController.RespostaConviteDTO("candidata-1"));

        assertEquals(HttpStatus.OK, resposta.getStatusCode());
        assertEquals("ACEITO", pedido.getConviteStatus());
        assertEquals(2, equipe.getIntegrantes().size());
        IntegranteEquipe entrante = equipe.getIntegrantes().get(1);
        assertEquals("candidata", entrante.getNomeUsuario());
        assertEquals("Arte", entrante.getFuncao());
        assertEquals("CONFIRMADO", entrante.getStatus());
        verify(equipeRepository).save(equipe);
        verify(procurandoEquipeRepository).deleteByEventoIdAndUsuarioId("evento-1", "candidata-1");
    }

    @Test
    void aceitarPedidoReativaIntegranteRecusadoSemDuplicarESemContarRecusadoNaCapacidade() {
        Mensagem pedido = pedido("PERFIL_BUSCA", "lider-1", "candidata-1");
        pedido.setFuncao("Arte");
        Equipe equipe = equipe();
        IntegranteEquipe recusado = new IntegranteEquipe("candidata", "A definir", "");
        recusado.setStatus("RECUSADO");
        equipe.setIntegrantes(new ArrayList<>(List.of(equipe.getIntegrantes().get(0), recusado)));
        Usuario lider = usuario("lider-1", "lider");
        Usuario candidata = usuario("candidata-1", "candidata");
        ProcurandoEquipe perfil = new ProcurandoEquipe();
        perfil.setEventoId("evento-1");
        perfil.setUsuarioId("candidata-1");

        when(mensagemRepository.findById("pedido-1")).thenReturn(Optional.of(pedido));
        when(equipeRepository.findById("equipe-1")).thenReturn(Optional.of(equipe));
        when(usuarioRepository.findById("lider-1")).thenReturn(Optional.of(lider));
        when(usuarioRepository.findById("candidata-1")).thenReturn(Optional.of(candidata));
        when(procurandoEquipeRepository.findByEventoIdAndUsuarioId("evento-1", "candidata-1"))
                .thenReturn(Optional.of(perfil));
        Conteudo evento = evento();
        evento.setTamanhoEquipe(2);
        when(conteudoRepository.findById("evento-1")).thenReturn(Optional.of(evento));
        when(equipeRepository.findByEventoIdOrderByCriadoEmDesc("evento-1")).thenReturn(List.of(equipe));
        when(mensagemRepository.findByDestinatarioIdAndEventoIdAndTipoAndOrigemAndConviteStatus(
                "candidata-1", "evento-1", "PEDIDO_EQUIPE", "PERFIL_BUSCA", "PENDENTE"))
                .thenReturn(List.of(pedido));
        when(mensagemRepository.save(pedido)).thenReturn(pedido);

        ResponseEntity<?> resposta = controller.aceitarPedido(
                "pedido-1", new MensagemController.RespostaConviteDTO("candidata-1"));

        assertEquals(HttpStatus.OK, resposta.getStatusCode());
        assertEquals("ACEITO", pedido.getConviteStatus());
        assertEquals(2, equipe.getIntegrantes().size());
        assertEquals(recusado, equipe.getIntegrantes().get(1));
        assertEquals("CONFIRMADO", recusado.getStatus());
        assertEquals("Arte", recusado.getFuncao());
        verify(equipeRepository).save(equipe);
    }

    @Test
    void aceitarPedidoAntigoMantemRemetenteComoEntrante() {
        Mensagem pedido = pedido("EQUIPE", "candidata-1", "lider-1");
        Equipe equipe = equipe();
        Usuario lider = usuario("lider-1", "lider");
        Usuario candidata = usuario("candidata-1", "candidata");

        when(mensagemRepository.findById("pedido-1")).thenReturn(Optional.of(pedido));
        when(equipeRepository.findById("equipe-1")).thenReturn(Optional.of(equipe));
        when(usuarioRepository.findById("candidata-1")).thenReturn(Optional.of(candidata));
        when(conteudoRepository.findById("evento-1")).thenReturn(Optional.of(evento()));
        when(equipeRepository.findByEventoIdOrderByCriadoEmDesc("evento-1")).thenReturn(List.of(equipe));
        when(mensagemRepository.findByDestinatarioIdAndEventoIdAndTipoAndOrigemAndConviteStatus(
                "candidata-1", "evento-1", "PEDIDO_EQUIPE", "PERFIL_BUSCA", "PENDENTE"))
                .thenReturn(List.of());
        when(mensagemRepository.save(pedido)).thenReturn(pedido);

        ResponseEntity<?> resposta = controller.aceitarPedido(
                "pedido-1", new MensagemController.RespostaConviteDTO("lider-1"));

        assertEquals(HttpStatus.OK, resposta.getStatusCode());
        assertEquals(2, equipe.getIntegrantes().size());
        assertEquals("candidata", equipe.getIntegrantes().get(1).getNomeUsuario());
        assertEquals("A definir", equipe.getIntegrantes().get(1).getFuncao());
        verify(procurandoEquipeRepository).deleteByEventoIdAndUsuarioId("evento-1", "candidata-1");
    }

    @Test
    void recusarPedidoDoPerfilNaoAdicionaIntegranteNemRemovePerfil() {
        Mensagem pedido = pedido("PERFIL_BUSCA", "lider-1", "candidata-1");
        Equipe equipe = equipe();
        Usuario lider = usuario("lider-1", "lider");
        Usuario candidata = usuario("candidata-1", "candidata");
        ProcurandoEquipe perfil = new ProcurandoEquipe();
        perfil.setEventoId("evento-1");
        perfil.setUsuarioId("candidata-1");

        when(mensagemRepository.findById("pedido-1")).thenReturn(Optional.of(pedido));
        when(equipeRepository.findById("equipe-1")).thenReturn(Optional.of(equipe));
        when(usuarioRepository.findById("lider-1")).thenReturn(Optional.of(lider));
        when(usuarioRepository.findById("candidata-1")).thenReturn(Optional.of(candidata));
        when(procurandoEquipeRepository.findByEventoIdAndUsuarioId("evento-1", "candidata-1"))
                .thenReturn(Optional.of(perfil));
        when(mensagemRepository.save(pedido)).thenReturn(pedido);

        ResponseEntity<?> resposta = controller.recusarPedido(
                "pedido-1", new MensagemController.RespostaConviteDTO("candidata-1"));

        assertEquals(HttpStatus.OK, resposta.getStatusCode());
        assertEquals("RECUSADO", pedido.getConviteStatus());
        assertEquals(1, equipe.getIntegrantes().size());
        verify(equipeRepository, never()).save(any());
        verify(procurandoEquipeRepository, never()).deleteByEventoIdAndUsuarioId(any(), any());
    }

    @Test
    void somenteODestinatarioPodeResponderOPedido() {
        Mensagem pedido = pedido("PERFIL_BUSCA", "lider-1", "candidata-1");
        when(mensagemRepository.findById("pedido-1")).thenReturn(Optional.of(pedido));

        ResponseEntity<?> resposta = controller.aceitarPedido(
                "pedido-1", new MensagemController.RespostaConviteDTO("lider-1"));

        assertEquals(HttpStatus.FORBIDDEN, resposta.getStatusCode());
        verify(equipeRepository, never()).save(any());
        verify(mensagemRepository, never()).save(any());
    }

    private Mensagem pedido(String origem, String remetenteId, String destinatarioId) {
        Mensagem pedido = new Mensagem();
        pedido.setId("pedido-1");
        pedido.setTipo("PEDIDO_EQUIPE");
        pedido.setOrigem(origem);
        pedido.setRemetenteId(remetenteId);
        pedido.setDestinatarioId(destinatarioId);
        pedido.setEquipeId("equipe-1");
        pedido.setEventoId("evento-1");
        pedido.setConviteStatus("PENDENTE");
        return pedido;
    }

    private Equipe equipe() {
        Equipe equipe = new Equipe();
        equipe.setId("equipe-1");
        equipe.setEventoId("evento-1");
        equipe.setNome("Equipe Teste");
        equipe.setLiderId("lider-1");
        equipe.setModelo("COMUM");
        equipe.setAbertaParaSolicitacoes(true);
        equipe.setIntegrantes(new ArrayList<>(List.of(new IntegranteEquipe("lider", "Programação", ""))));
        return equipe;
    }

    private Usuario usuario(String id, String username) {
        Usuario usuario = new Usuario();
        usuario.setId(id);
        usuario.setUsername(username);
        usuario.setNomeExibicao(username);
        return usuario;
    }

    private Conteudo evento() {
        Conteudo evento = new Conteudo();
        evento.setId("evento-1");
        evento.setTipo(TipoConteudo.GAME_JAM);
        evento.setModeloEquipe("COMUM");
        evento.setTamanhoEquipe(4);
        return evento;
    }
}
