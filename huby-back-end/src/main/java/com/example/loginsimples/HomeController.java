package com.example.loginsimples;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/home")
@CrossOrigin(origins = "*")
public class HomeController {

    private static final int LIMITE_POR_CARROSSEL = 8;

    private final ConteudoRepository conteudoRepository;

    public HomeController(ConteudoRepository conteudoRepository) {
        this.conteudoRepository = conteudoRepository;
    }

    public record CarrosselDTO(String id, String titulo, String subtitulo, List<Conteudo> itens) {
    }

    @GetMapping("/carrosseis")
    public List<CarrosselDTO> carrosseis() {
        List<CarrosselDTO> carrosseis = new ArrayList<>();

        Optional<Conteudo> ultimaJam = conteudoRepository.findFirstByTipoOrderByDataFimDesc(TipoConteudo.GAME_JAM);

        if (ultimaJam.isPresent()) {
            List<Conteudo> jogosDaJam = conteudoRepository
                    .findByGameJamIdOrderByRelevanciaDesc(ultimaJam.get().getId());

            if (!jogosDaJam.isEmpty()) {
                carrosseis.add(new CarrosselDTO(
                        "ultima-gamejam",
                        "Última Game Jam",
                        ultimaJam.get().getTitulo(),
                        limitar(jogosDaJam)
                ));
            }
        }

        List<Conteudo> relevantes = conteudoRepository
                .findByTipoOrderByRelevanciaDescNotaDesc(TipoConteudo.JOGO);

        if (!relevantes.isEmpty()) {
            carrosseis.add(new CarrosselDTO(
                    "jogos-relevantes",
                    "Jogos Mais Relevantes",
                    "Os jogos mais bem avaliados pela comunidade",
                    limitar(relevantes)
            ));
        }

        List<Conteudo> destaques = conteudoRepository.findByDestaqueTrueOrderByDataPublicacaoDesc();

        if (!destaques.isEmpty()) {
            carrosseis.add(new CarrosselDTO(
                    "em-destaque",
                    "Em Destaque",
                    "Selecionados pela curadoria do Huby",
                    limitar(destaques)
            ));
        }

        List<Conteudo> comunidadeEventos = conteudoRepository
                .findByTipoInOrderByDataPublicacaoDesc(List.of(TipoConteudo.EVENTO, TipoConteudo.COMUNIDADE));

        if (!comunidadeEventos.isEmpty()) {
            carrosseis.add(new CarrosselDTO(
                    "comunidade-eventos",
                    "Comunidade e Eventos",
                    "Encontros, mostras e coletivos ativos",
                    limitar(comunidadeEventos)
            ));
        }

        return carrosseis;
    }

    private List<Conteudo> limitar(List<Conteudo> itens) {
        return itens.size() > LIMITE_POR_CARROSSEL
                ? itens.subList(0, LIMITE_POR_CARROSSEL)
                : itens;
    }
}
