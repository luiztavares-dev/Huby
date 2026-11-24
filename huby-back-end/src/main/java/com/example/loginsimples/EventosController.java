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

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Comparator;
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
    private final EventoService eventoService;

    public EventosController(ConteudoRepository conteudoRepository,
                             UsuarioRepository usuarioRepository,
                             EventoService eventoService) {
        this.conteudoRepository = conteudoRepository;
        this.usuarioRepository = usuarioRepository;
        this.eventoService = eventoService;
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
            LocalDateTime inscricoesInicio,
            LocalDateTime inscricoesFim,
            LocalDateTime desenvolvimentoInicio,
            LocalDateTime desenvolvimentoFim,
            LocalDateTime analiseInicio,
            LocalDateTime analiseFim,
            LocalDateTime dataPremiacao,
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

        List<Conteudo> comPrazo = todos.stream()
                .filter(PeriodoEvento::inscricoesAbertas)
                .sorted(Comparator.comparing(PeriodoEvento::fimInscricoes,
                        Comparator.nullsLast(Comparator.naturalOrder())))
                .toList();

        List<Conteudo> inscricoes = completar(comPrazo, todos, LIMITE_INSCRICOES);
        List<Conteudo> destaques = montarDestaques(todos, hoje);
        List<Conteudo> gameJams = limitar(
                conteudoRepository.findByTipoOrderByDataInicioDesc(TipoConteudo.GAME_JAM), LIMITE_JAMS);

        return new EventosDTO(
                eventoService.apresentar(destaques),
                eventoService.apresentar(inscricoes),
                eventoService.apresentar(gameJams));
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
        if (!List.of("COMUM", "SURPRESA", "INDIVIDUAL").contains(modelo)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Modelo de equipe inválido. Use COMUM, SURPRESA ou INDIVIDUAL.");
        }

        int tamanhoEquipe = dto.tamanhoEquipe() == null ? 4 : dto.tamanhoEquipe();
        if (tamanhoEquipe < 2 || tamanhoEquipe > 30) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "O tamanho da equipe deve estar entre 2 e 30 integrantes.");
        }

        LocalDateTime inscricoesInicio = dto.inscricoesInicio();
        LocalDateTime inscricoesFim = dto.inscricoesFim() != null
                ? dto.inscricoesFim()
                : dto.inscricoesAte() == null ? null : dto.inscricoesAte().atTime(LocalTime.MAX);
        LocalDateTime desenvolvimentoInicio = dto.desenvolvimentoInicio() != null
                ? dto.desenvolvimentoInicio()
                : dto.dataInicio() == null ? null : dto.dataInicio().atStartOfDay();
        LocalDateTime desenvolvimentoFim = dto.desenvolvimentoFim() != null
                ? dto.desenvolvimentoFim()
                : dto.dataFim() == null ? null : dto.dataFim().atTime(LocalTime.MAX);
        if (inscricoesFim == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Informe a data e o horário de término das inscrições.");
        }
        if (desenvolvimentoInicio == null || desenvolvimentoFim == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Informe as datas e os horários de início e término do desenvolvimento.");
        }
        validarPeriodo(inscricoesInicio, inscricoesFim, "inscrição");
        validarPeriodo(desenvolvimentoInicio, desenvolvimentoFim, "desenvolvimento");
        validarPeriodo(dto.analiseInicio(), dto.analiseFim(), "análise");
        if (dto.inscricoesFim() != null || dto.desenvolvimentoInicio() != null) {
            validarOrdem(inscricoesFim, desenvolvimentoInicio,
                    "O desenvolvimento deve começar após as inscrições.");
        }
        if (dto.desenvolvimentoFim() != null || dto.analiseInicio() != null) {
            validarOrdem(desenvolvimentoFim, dto.analiseInicio(),
                    "A análise deve começar após o desenvolvimento.");
        }
        LocalDateTime fimAnalise = dto.analiseFim() != null ? dto.analiseFim() : dto.analiseInicio();
        validarOrdem(fimAnalise, dto.dataPremiacao(), "A premiação deve ocorrer após a análise.");

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
        evento.setDataInicio(PeriodoEvento.dataLegacy(desenvolvimentoInicio));
        evento.setDataFim(PeriodoEvento.dataLegacy(desenvolvimentoFim));
        evento.setInscricoesAte(PeriodoEvento.dataLegacy(inscricoesFim));
        evento.setInscricoesInicio(inscricoesInicio);
        evento.setInscricoesFim(inscricoesFim);
        evento.setDesenvolvimentoInicio(desenvolvimentoInicio);
        evento.setDesenvolvimentoFim(desenvolvimentoFim);
        evento.setAnaliseInicio(dto.analiseInicio());
        evento.setAnaliseFim(dto.analiseFim());
        evento.setDataPremiacao(dto.dataPremiacao());
        evento.setTamanhoEquipe(tamanhoEquipe);
        evento.setModeloEquipe(modelo);
        evento.setTags(dto.tags() == null ? new ArrayList<>() : dto.tags());
        evento.setRegras(dto.regras() == null ? new ArrayList<>() : dto.regras());
        evento.setPremios(normalizarPremios(dto.premios()));
        evento.setCronograma(dto.cronograma() == null ? new ArrayList<>() : dto.cronograma());
        evento.setParticipantes(0);
        evento.setEquipesInscritas(0);
        evento.setSorteioRealizado(false);
        return eventoService.apresentar(conteudoRepository.save(evento));
    }

    private void validarPeriodo(LocalDateTime inicio, LocalDateTime fim, String nome) {
        if (inicio != null && fim != null && fim.isBefore(inicio)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "O término do período de " + nome + " não pode ser anterior ao início.");
        }
    }

    private void validarOrdem(LocalDateTime anterior, LocalDateTime proximo, String mensagem) {
        if (anterior != null && proximo != null && proximo.isBefore(anterior)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, mensagem);
        }
    }

    private List<Premio> normalizarPremios(List<Premio> premios) {
        if (premios == null) return new ArrayList<>();

        List<Premio> normalizados = new ArrayList<>();
        for (Premio premio : premios) {
            if (premio == null) continue;

            String valor = premio.getValor() == null ? "" : premio.getValor().trim();
            if (!valor.isEmpty()) {
                if (!valor.matches("\\d+(?:\\.\\d{1,2})?")) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                            "Os valores em dinheiro devem conter somente números e até duas casas decimais.");
                }
                try {
                    premio.setValor(new BigDecimal(valor).toPlainString());
                } catch (NumberFormatException ex) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                            "Informe um valor numérico válido para o prêmio.");
                }
            }
            normalizados.add(premio);
        }
        return normalizados;
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
