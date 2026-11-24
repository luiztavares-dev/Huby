package com.example.loginsimples;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SorteioEquipeServiceTest {

    @Mock
    private ConteudoRepository conteudoRepository;
    @Mock
    private EquipeRepository equipeRepository;

    @InjectMocks
    private SorteioEquipeService service;

    @Test
    void sorteiaInscricoesEmEquipesDoTamanhoDefinidoSemDuplicarPessoas() {
        Conteudo evento = new Conteudo();
        evento.setId("evento-1");
        evento.setModeloEquipe("SURPRESA");
        evento.setTamanhoEquipe(3);
        evento.setInscricoesFim(LocalDateTime.now().minusMinutes(1));
        evento.setSorteioRealizado(false);

        List<Equipe> inscricoes = new ArrayList<>();
        Map<String, String> usuarioPorId = new HashMap<>();
        for (int indice = 1; indice <= 5; indice++) {
            String usuarioId = "usuario-" + indice;
            String username = "candidata" + indice;
            Equipe inscricao = new Equipe();
            inscricao.setId("inscricao-" + indice);
            inscricao.setEventoId("evento-1");
            inscricao.setLiderId(usuarioId);
            inscricao.setModelo("SURPRESA");
            inscricao.setAguardandoSorteio(true);
            inscricao.setExperiencia("INICIANTE");
            inscricao.setIntegrantes(List.of(new IntegranteEquipe(username, "Arte", "")));
            inscricoes.add(inscricao);
            usuarioPorId.put(usuarioId, username);
        }

        when(conteudoRepository.findByModeloEquipeAndSorteioRealizadoNot(true))
                .thenReturn(List.of(evento));
        when(equipeRepository.findByEventoIdOrderByCriadoEmDesc("evento-1")).thenReturn(List.of());
        when(equipeRepository.findByEventoIdAndAguardandoSorteioTrueOrderByCriadoEmAsc("evento-1"))
                .thenReturn(inscricoes);

        service.realizarSorteiosPendentes();

        ArgumentCaptor<List<Equipe>> captor = ArgumentCaptor.forClass(List.class);
        verify(equipeRepository).saveAll(captor.capture());
        List<Equipe> sorteadas = captor.getValue();

        assertEquals(2, sorteadas.size());
        assertEquals(3, sorteadas.get(0).getIntegrantes().size());
        assertEquals(2, sorteadas.get(1).getIntegrantes().size());

        Set<String> participantes = new HashSet<>();
        for (Equipe equipe : sorteadas) {
            assertFalse(equipe.getAguardandoSorteio());
            assertTrue(equipe.getIntegrantes().stream()
                    .anyMatch(integrante -> integrante.getNomeUsuario()
                            .equals(usuarioPorId.get(equipe.getLiderId()))));
            equipe.getIntegrantes().forEach(integrante -> participantes.add(integrante.getNomeUsuario()));
        }
        assertEquals(5, participantes.size());
        assertTrue(evento.getSorteioRealizado());
        verify(equipeRepository).deleteAll(inscricoes);
    }
}
