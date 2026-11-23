package com.example.loginsimples;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/home")
@CrossOrigin(origins = "*")
public class HomeController {

    private static final int LIMITE_POR_CARROSSEL = 10;

    private final ConteudoRepository conteudoRepository;

    public HomeController(ConteudoRepository conteudoRepository) {
        this.conteudoRepository = conteudoRepository;
    }

    public record CarrosselDTO(String id, String titulo, String subtitulo, List<Conteudo> itens) {
    }

    @GetMapping("/carrosseis")
    public List<CarrosselDTO> carrosseis() {
        List<CarrosselDTO> carrosseis = new ArrayList<>();
        List<Conteudo> jogos = conteudoRepository
                .findByTipoOrderByRelevanciaDescNotaDesc(TipoConteudo.JOGO);

        Optional<Conteudo> ultimaJam = conteudoRepository.findFirstByTipoOrderByDataFimDesc(TipoConteudo.GAME_JAM);

        ultimaJam.ifPresent(jam -> adicionarCarrossel(
                carrosseis,
                "ultima-gamejam",
                "Última Game Jam",
                jam.getTitulo(),
                conteudoRepository.findByGameJamIdOrderByRelevanciaDesc(jam.getId())
        ));

        adicionarCarrossel(
                carrosseis,
                "jogos-relevantes",
                "Jogos Mais Relevantes",
                "Os jogos mais bem avaliados pela comunidade",
                jogos
        );

        List<Conteudo> recentes = jogos.stream()
                .sorted(Comparator.comparing(Conteudo::getDataPublicacao,
                        Comparator.nullsLast(Comparator.reverseOrder())))
                .toList();

        adicionarCarrossel(
                carrosseis,
                "lancamentos-recentes",
                "Lançamentos Recentes",
                "Novos mundos e histórias recém-chegados ao Huby",
                recentes
        );

        List<Conteudo> gratuitos = jogos.stream()
                .filter(jogo -> jogo.getPreco() != null && jogo.getPreco() == 0.0)
                .toList();

        adicionarCarrossel(
                carrosseis,
                "jogos-gratuitos",
                "Jogos Gratuitos",
                "Experiências completas para começar a jogar sem pagar nada",
                gratuitos
        );

        List<Conteudo> acessiveis = jogos.stream()
                .filter(jogo -> jogo.getPreco() != null && jogo.getPreco() <= 10.0)
                .toList();

        adicionarCarrossel(
                carrosseis,
                "jogos-ate-dez",
                "Até R$ 10",
                "Uma seleção de jogos por um preço bem acessível",
                acessiveis
        );

        List<Conteudo> noNavegador = jogos.stream()
                .filter(jogo -> jogo.getPlataformas() != null && jogo.getPlataformas().contains("website"))
                .toList();

        adicionarCarrossel(
                carrosseis,
                "jogos-no-navegador",
                "Jogos no Navegador",
                "Para jogar direto no navegador, sem instalação",
                noNavegador
        );

        List<Conteudo> destaques = jogos.stream()
                .filter(jogo -> Boolean.TRUE.equals(jogo.getDestaque()))
                .toList();

        adicionarCarrossel(
                carrosseis,
                "em-destaque",
                "Em Destaque",
                "Selecionados pela curadoria do Huby",
                destaques
        );

        return carrosseis;
    }

    @GetMapping("/jogos")
    public List<Conteudo> jogos() {
        return conteudoRepository.findByTipoOrderByRelevanciaDescNotaDesc(TipoConteudo.JOGO);
    }

    private void adicionarCarrossel(List<CarrosselDTO> carrosseis, String id, String titulo,
                                    String subtitulo, List<Conteudo> itens) {
        List<Conteudo> jogos = itens.stream()
                .filter(item -> item.getTipo() == TipoConteudo.JOGO)
                .toList();

        if (!jogos.isEmpty()) {
            carrosseis.add(new CarrosselDTO(id, titulo, subtitulo, limitar(jogos)));
        }
    }

    private List<Conteudo> limitar(List<Conteudo> itens) {
        return itens.size() > LIMITE_POR_CARROSSEL
                ? itens.subList(0, LIMITE_POR_CARROSSEL)
                : itens;
    }
}
