package com.example.loginsimples;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

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
    private final UsuarioRepository usuarioRepository;

    public EventosController(ConteudoRepository conteudoRepository, UsuarioRepository usuarioRepository) {
        this.conteudoRepository = conteudoRepository;
        this.usuarioRepository = usuarioRepository;
    }

    public record CriarEventoDTO(
            String criadorId,
            String tipo,
            String titulo,
            String descricao,
            String imagem,
            String organizador,
            String tema,
            String local,
            String bannerUrl,
            String tipoPremiacao,
            List<String> contatos,
            LocalDate dataInicio,
            LocalDate dataFim,
            LocalDate inscricoesAte,
            Integer tamanhoEquipe,
            String modeloEquipe,
            List<String> tags,
            List<String> regras,
            List<Premio> premios,
            List<EtapaCronograma> cronograma
    ) {}

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
        Conteudo evento = conteudoRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Evento não encontrado."));

        if (evento.getDataFim() != null && LocalDate.now().isBefore(evento.getDataFim())) {
            return List.of();
        }
        return conteudoRepository.findByGameJamIdOrderByRelevanciaDesc(id);
    }

    @PostMapping
    public Conteudo criar(@RequestBody CriarEventoDTO dto) {
        if (dto == null || dto.titulo() == null || dto.titulo().trim().length() < 3) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Informe um título válido.");
        }
        if (dto.criadorId() == null || dto.criadorId().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Informe o criador do evento.");
        }
        if (usuarioRepository.findById(dto.criadorId()).isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuário criador não encontrado.");
        }
        if (dto.dataInicio() == null || dto.dataFim() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Informe as datas de início e término.");
        }
        if (dto.dataFim().isBefore(dto.dataInicio())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "A data de término não pode ser anterior à data de início.");
        }

        TipoConteudo tipo;
        try {
            tipo = TipoConteudo.valueOf(dto.tipo() == null ? "GAME_JAM" : dto.tipo().trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tipo de evento inválido.");
        }
        if (tipo != TipoConteudo.EVENTO && tipo != TipoConteudo.GAME_JAM) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Só é possível criar eventos ou game jams.");
        }

        String modelo = dto.modeloEquipe() == null ? "COMUM" : dto.modeloEquipe().trim().toUpperCase();
        if (!List.of("COMUM", "SURPRESA", "INDIVIDUAL").contains(modelo)) modelo = "COMUM";

        Conteudo evento = new Conteudo();
        evento.setTipo(tipo);
        evento.setCriadorId(dto.criadorId());
        evento.setTitulo(dto.titulo().trim());
        evento.setDescricao(dto.descricao() == null ? "" : dto.descricao().trim());
        evento.setDescricaoLonga(dto.descricao() == null ? "" : dto.descricao().trim());
        evento.setImagem(dto.imagem() == null ? "" : dto.imagem().trim());
        evento.setDesenvolvedor(dto.organizador() == null ? "" : dto.organizador().trim());
        evento.setTema(dto.tema() == null ? "" : dto.tema().trim());
        evento.setLocal(dto.local() == null ? "" : dto.local().trim());
        evento.setBannerUrl(dto.bannerUrl() == null ? "" : dto.bannerUrl().trim());
        evento.setTipoPremiacao(dto.tipoPremiacao() == null ? "SEM_PREMIACAO" : dto.tipoPremiacao().trim());
        evento.setContatos(dto.contatos() == null ? new ArrayList<>() : dto.contatos());
        evento.setDataPublicacao(LocalDate.now());
        evento.setDataInicio(dto.dataInicio());
        evento.setDataFim(dto.dataFim());
        evento.setInscricoesAte(dto.inscricoesAte());
        evento.setTamanhoEquipe(dto.tamanhoEquipe() == null ? 4 : dto.tamanhoEquipe());
        evento.setModeloEquipe(modelo);
        evento.setTags(dto.tags() == null ? new ArrayList<>() : dto.tags());
        evento.setRegras(dto.regras() == null ? new ArrayList<>() : dto.regras());
        evento.setPremios(dto.premios() == null ? new ArrayList<>() : dto.premios());
        evento.setCronograma(dto.cronograma() == null ? new ArrayList<>() : dto.cronograma());
        evento.setParticipantes(0);
        evento.setEquipesInscritas(0);
        return conteudoRepository.save(evento);
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
