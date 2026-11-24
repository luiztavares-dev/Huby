package com.example.loginsimples;

import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Service
public class EventoService {

    private final EquipeRepository equipeRepository;

    public EventoService(EquipeRepository equipeRepository) {
        this.equipeRepository = equipeRepository;
    }

    public Conteudo apresentar(Conteudo evento) {
        return apresentar(evento, equipeRepository.findByEventoIdOrderByCriadoEmDesc(evento.getId()));
    }

    public List<Conteudo> apresentar(List<Conteudo> eventos) {
        Map<String, List<Equipe>> equipesPorEvento = new HashMap<>();
        for (Equipe equipe : equipeRepository.findAll()) {
            equipesPorEvento
                    .computeIfAbsent(equipe.getEventoId(), chave -> new ArrayList<>())
                    .add(equipe);
        }

        List<Conteudo> resposta = new ArrayList<>();
        for (Conteudo evento : eventos) {
            resposta.add(apresentar(evento, equipesPorEvento.getOrDefault(evento.getId(), List.of())));
        }
        return resposta;
    }

    private Conteudo apresentar(Conteudo evento, List<Equipe> equipes) {
        Conteudo publico = new Conteudo();
        BeanUtils.copyProperties(evento, publico);

        Set<String> participantes = new HashSet<>();
        int equipesInscritas = 0;
        for (Equipe equipe : equipes) {
            if (!Boolean.TRUE.equals(equipe.getAguardandoSorteio())) equipesInscritas++;
            for (IntegranteEquipe integrante : equipe.getIntegrantes() == null
                    ? List.<IntegranteEquipe>of() : equipe.getIntegrantes()) {
                if (integrante == null || "RECUSADO".equals(integrante.getStatus())) continue;
                String username = integrante.getNomeUsuario();
                if (username != null && !username.isBlank()) {
                    participantes.add(username.trim().toLowerCase(Locale.ROOT));
                }
            }
        }

        publico.setParticipantes(participantes.size());
        publico.setEquipesInscritas(equipesInscritas);
        if (!PeriodoEvento.temaRevelado(evento)) publico.setTema("");
        return publico;
    }
}
