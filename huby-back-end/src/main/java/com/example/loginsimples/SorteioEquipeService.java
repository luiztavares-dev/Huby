package com.example.loginsimples;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/** Forma aleatoriamente as equipes depois que o período de inscrição termina. */
@Service
public class SorteioEquipeService {

    private final ConteudoRepository conteudoRepository;
    private final EquipeRepository equipeRepository;

    public SorteioEquipeService(ConteudoRepository conteudoRepository, EquipeRepository equipeRepository) {
        this.conteudoRepository = conteudoRepository;
        this.equipeRepository = equipeRepository;
    }

    @Transactional
    public synchronized void realizarSorteiosPendentes() {
        for (Conteudo evento : conteudoRepository.findByModeloEquipeAndSorteioRealizadoNot(true)) {
            if (!"SURPRESA".equals(evento.getModeloEquipe())) continue;

            LocalDateTime fimInscricoes = PeriodoEvento.fimInscricoes(evento);
            if (fimInscricoes == null || !LocalDateTime.now().isAfter(fimInscricoes)) continue;

            sortearEvento(evento);
        }
    }

    private void sortearEvento(Conteudo evento) {
        if (Boolean.TRUE.equals(evento.getSorteioRealizado())) return;

        List<Equipe> equipesExistentes = equipeRepository.findByEventoIdOrderByCriadoEmDesc(evento.getId());
        List<Equipe> inscricoes = equipeRepository
                .findByEventoIdAndAguardandoSorteioTrueOrderByCriadoEmAsc(evento.getId());
        Set<String> usuariosJaInscritos = new HashSet<>();
        for (Equipe equipe : equipesExistentes) {
            if (Boolean.TRUE.equals(equipe.getAguardandoSorteio())) continue;
            for (IntegranteEquipe integrante : integrantesAtivos(equipe)) {
                if (integrante.getNomeUsuario() != null && !integrante.getNomeUsuario().isBlank()) {
                    usuariosJaInscritos.add(integrante.getNomeUsuario().trim().toLowerCase(Locale.ROOT));
                }
            }
        }

        List<Participante> participantes = new ArrayList<>();
        for (Equipe inscricao : inscricoes) {
            for (IntegranteEquipe integrante : integrantesAtivos(inscricao)) {
                String username = integrante.getNomeUsuario() == null
                        ? "" : integrante.getNomeUsuario().trim();
                if (username.isEmpty()
                        || !usuariosJaInscritos.add(username.toLowerCase(Locale.ROOT))) continue;

                IntegranteEquipe copia = new IntegranteEquipe(
                        username,
                        integrante.getFuncao() == null ? "A definir" : integrante.getFuncao(),
                        integrante.getAvatar() == null ? "" : integrante.getAvatar());
                copia.setStatus("CONFIRMADO");
                participantes.add(new Participante(copia, inscricao.getLiderId(), inscricao.getExperiencia()));
            }
        }

        Collections.shuffle(participantes);

        int tamanho = Math.max(2, evento.getTamanhoEquipe() == null ? 4 : evento.getTamanhoEquipe());
        List<Equipe> equipesSorteadas = new ArrayList<>();
        Set<String> nomesExistentes = new HashSet<>();
        equipesExistentes.stream()
                .map(Equipe::getNome)
                .filter(nome -> nome != null)
                .forEach(nome -> nomesExistentes.add(nome.toLowerCase(Locale.ROOT)));

        int numeroEquipe = 1;
        for (int inicio = 0; inicio < participantes.size(); inicio += tamanho) {
            List<Participante> grupo = participantes.subList(inicio,
                    Math.min(inicio + tamanho, participantes.size()));
            List<IntegranteEquipe> integrantes = grupo.stream()
                    .map(Participante::integrante)
                    .toList();

            String nome;
            do {
                nome = "Equipe Surpresa " + numeroEquipe++;
            } while (nomesExistentes.contains(nome.toLowerCase(Locale.ROOT)));
            nomesExistentes.add(nome.toLowerCase(Locale.ROOT));

            Equipe equipe = new Equipe();
            equipe.setEventoId(evento.getId());
            equipe.setNome(nome);
            equipe.setLiderId(grupo.get(0).usuarioId() == null ? "" : grupo.get(0).usuarioId());
            equipe.setModelo("SURPRESA");
            equipe.setAguardandoSorteio(false);
            equipe.setAbertaParaSolicitacoes(false);
            equipe.setIntegrantes(new ArrayList<>(integrantes));
            equipe.setExperiencia(grupo.stream()
                    .map(Participante::experiencia)
                    .filter(valor -> valor != null && !valor.isBlank())
                    .findFirst()
                    .orElse("INICIANTE"));
            equipe.setCriadoEm(LocalDate.now());
            equipesSorteadas.add(equipe);
        }

        equipeRepository.saveAll(equipesSorteadas);
        if (!inscricoes.isEmpty()) equipeRepository.deleteAll(inscricoes);

        List<String> nomesFinais = new ArrayList<>();
        equipesExistentes.stream()
                .filter(equipe -> !Boolean.TRUE.equals(equipe.getAguardandoSorteio()))
                .map(Equipe::getNome)
                .filter(nome -> nome != null && !nome.isBlank())
                .forEach(nomesFinais::add);
        equipesSorteadas.stream().map(Equipe::getNome).forEach(nomesFinais::add);
        evento.setEquipes(nomesFinais);
        evento.setEquipesInscritas(nomesFinais.size());
        evento.setSorteioRealizado(true);
        conteudoRepository.save(evento);
    }

    private List<IntegranteEquipe> integrantesAtivos(Equipe equipe) {
        if (equipe.getIntegrantes() == null) return List.of();
        return equipe.getIntegrantes().stream()
                .filter(integrante -> integrante != null && !"RECUSADO".equals(integrante.getStatus()))
                .toList();
    }

    private record Participante(IntegranteEquipe integrante, String usuarioId, String experiencia) {
    }
}
