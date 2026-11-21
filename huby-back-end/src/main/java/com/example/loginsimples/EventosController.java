package com.example.loginsimples;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@RestController
@RequestMapping("/api/eventos")
@CrossOrigin(origins = "*")
public class EventosController {

    private static final List<TipoConteudo> TIPOS_EVENTO =
            List.of(TipoConteudo.EVENTO, TipoConteudo.GAME_JAM);

    private static final int LIMITE_DESTAQUES = 5;
    private static final int LIMITE_INSCRICOES = 5;
    private static final int LIMITE_JAMS = 6;

    private final ConteudoRepository conteudoRepository;

    public EventosController(ConteudoRepository conteudoRepository) {
        this.conteudoRepository = conteudoRepository;
    }

    public record EventosDTO(List<Conteudo> destaques,
                             List<Conteudo> inscricoesTerminando,
                             List<Conteudo> gameJams) {
    }

    @GetMapping
    public EventosDTO listar() {
        LocalDate hoje = LocalDate.now();

        List<Conteudo> todos = conteudoRepository.findByTipoInOrderByDataInicioAsc(TIPOS_EVENTO);

        List<Conteudo> comPrazo = conteudoRepository
                .findByTipoInAndInscricoesAteGreaterThanEqualOrderByInscricoesAteAsc(TIPOS_EVENTO, hoje);

        List<Conteudo> inscricoes = completar(comPrazo, todos, LIMITE_INSCRICOES);
        List<Conteudo> destaques = montarDestaques(todos, hoje);
        List<Conteudo> gameJams = limitar(
                conteudoRepository.findByTipoOrderByDataInicioDesc(TipoConteudo.GAME_JAM), LIMITE_JAMS);

        return new EventosDTO(destaques, inscricoes, gameJams);
    }

    @GetMapping("/{id}/jogos")
    public List<Conteudo> jogosPublicados(@PathVariable String id) {
        return conteudoRepository.findByGameJamIdOrderByRelevanciaDesc(id);
    }

    /**
     * Destaques: primeiro os marcados como destaque, depois os próximos eventos.
     * Sem duplicatas, respeitando o limite do carrossel.
     */
    private List<Conteudo> montarDestaques(List<Conteudo> todos, LocalDate hoje) {
        Set<Conteudo> selecionados = new LinkedHashSet<>();

        todos.stream()
                .filter(c -> Boolean.TRUE.equals(c.getDestaque()))
                .forEach(selecionados::add);

        todos.stream()
                .filter(c -> c.getDataInicio() != null && !c.getDataInicio().isBefore(hoje))
                .forEach(selecionados::add);

        todos.forEach(selecionados::add);

        return selecionados.stream().limit(LIMITE_DESTAQUES).toList();
    }

    /** Completa a lista de inscrições com outros eventos quando faltam prazos futuros. */
    private List<Conteudo> completar(List<Conteudo> prioritarios, List<Conteudo> todos, int limite) {
        List<Conteudo> resultado = new ArrayList<>(prioritarios);

        for (Conteudo conteudo : todos) {
            if (resultado.size() >= limite) break;
            boolean jaIncluido = resultado.stream().anyMatch(item -> item.getId().equals(conteudo.getId()));
            if (!jaIncluido) {
                resultado.add(conteudo);
            }
        }

        return limitar(resultado, limite);
    }

    private List<Conteudo> limitar(List<Conteudo> itens, int limite) {
        return itens.size() > limite ? itens.subList(0, limite) : itens;
    }
}
