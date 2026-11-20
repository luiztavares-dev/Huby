package com.example.loginsimples;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.List;

/**
 * Popula a coleção de conteúdos com dados fictícios na primeira execução.
 * Não sobrescreve nada se a coleção já tiver registros.
 */
@Component
public class DataSeeder implements CommandLineRunner {

    private final ConteudoRepository repository;

    @Value("${huby.seed.enabled:true}")
    private boolean seedEnabled;

    public DataSeeder(ConteudoRepository repository) {
        this.repository = repository;
    }

    @Override
    public void run(String... args) {
        if (!seedEnabled || repository.count() > 0) {
            return;
        }

        repository.saveAll(List.of(
                gameJam("jam-polvo-2026-03", "Polvo Jam 2026.03", "Estúdio Polvo",
                        "Terceira edição da jam do Estúdio Polvo: 48 horas para transformar um tema surpresa em um protótipo jogável.",
                        "/imagem-polvojam.jpg", LocalDate.of(2026, 10, 15), LocalDate.of(2026, 11, 13), LocalDate.of(2026, 11, 15),
                        "Online", 1240, 95, false,
                        List.of("GAME JAM", "COMUNIDADE")),
                gameJam("jam-global-2026", "Global Game Jam 2026", "GGJ Foundation",
                        "A maior jam presencial do mundo reúne sedes em todo o planeta para criar jogos em um fim de semana.",
                        "/imagem-ggj.png", LocalDate.of(2026, 1, 5), LocalDate.of(2026, 1, 30), LocalDate.of(2026, 2, 1),
                        "Presencial e online", 5800, 90, false,
                        List.of("GAME JAM", "MUNDIAL")),
                gameJam("jam-brasil-2026", "Brasil Game Jam 2026", "BJam Org",
                        "Maratona nacional de criação de jogos com mentorias, palestras e premiação para os projetos mais criativos.",
                        "/imagem-bgj.jpg", LocalDate.of(2026, 7, 1), LocalDate.of(2026, 8, 7), LocalDate.of(2026, 8, 9),
                        "São Paulo, SP", 3120, 84, false,
                        List.of("GAME JAM", "BRASIL")),

                jogo("jogo-silksong", "Hollow Knight: Silksong", "Team Cherry",
                        "Ação e aventura metroidvania no reino de Pharloom.",
                        "No controle de Hornet, o jogador explora um reino desconhecido cheio de perigos, enfrenta criaturas desafiadoras e descobre novas habilidades em uma jornada até o pico do mundo.",
                        "/Silksong.png", 4.8, 582, 98,
                        List.of("AVENTURA", "METROIDVANIA"), List.of("pc", "website"), true,
                        LocalDate.of(2026, 11, 18), null),

                jogo("jogo-jundu", "Jundu's Sprouts", "Jundu Studios",
                        "Plataforma 2D sobre um pequeno alienígena e suas sementes.",
                        "Controle Jundu, um pequeno alienígena que precisa coletar sementes e evitar obstáculos para salvar seu planeta natal em uma aventura de plataforma cheia de personalidade.",
                        "/imagem-insperarte.jpg", 4.6, 312, 94,
                        List.of("PLATAFORMA", "PIXEL ART"), List.of("pc", "website"), true,
                        LocalDate.of(2026, 10, 20), null),

                jogo("jogo-semente-zero", "Semente Zero", "Coletivo Polvo",
                        "Um protótipo nascido na Polvo Jam sobre reconstruir um ecossistema.",
                        "Criado em 48 horas durante a Polvo Jam 2026.03, Semente Zero coloca você no papel de um jardineiro orbital que precisa devolver a vida a um planeta adormecido.",
                        "/imagem-polvojam.jpg", 4.7, 214, 92,
                        List.of("PLATAFORMA", "INDIE"), List.of("pc", "website"), true,
                        LocalDate.of(2026, 11, 16), "jam-polvo-2026-03"),

                jogo("jogo-coral-em-fluxo", "Coral em Fluxo", "Maré Studio",
                        "Puzzle relaxante sobre correntes marítimas e recifes.",
                        "Um puzzle de ritmo lento em que você direciona correntes para restaurar recifes de coral. Cada fase combina quebra-cabeças ambientais com uma trilha sonora adaptativa.",
                        "/imagem-insperarte.jpg", 4.5, 168, 88,
                        List.of("PUZZLE", "RELAXANTE"), List.of("website", "mobile"), false,
                        LocalDate.of(2026, 11, 8), "jam-polvo-2026-03"),

                jogo("jogo-ruido-branco", "Ruído Branco", "Estúdio Sinal",
                        "Terror narrativo sobre uma estação de rádio abandonada.",
                        "Investigue transmissões misteriosas em uma estação de rádio no interior. A cada noite, o som revela uma parte da história e aproxima você de algo que não deveria estar no ar.",
                        "/imagem-ggj.png", 4.3, 121, 81,
                        List.of("TERROR", "NARRATIVA"), List.of("pc"), false,
                        LocalDate.of(2026, 11, 15), "jam-polvo-2026-03"),

                jogo("jogo-linha-de-mare", "Linha de Maré", "Coletivo Maré",
                        "Exploração costeira com navegação e descobertas.",
                        "Navegue por uma costa fictícia, mapeie vilarejos e descubra histórias locais em um jogo de exploração tranquilo, feito para sessões curtas.",
                        "/imagem-bgj.jpg", 4.2, 97, 78,
                        List.of("AVENTURA", "EXPLORAÇÃO"), List.of("pc", "website"), false,
                        LocalDate.of(2026, 11, 14), "jam-polvo-2026-03"),

                jogo("jogo-jardim-de-vidro", "Jardim de Vidro", "Estúdio Estufa",
                        "Simulação de cultivo em uma estufa suspensa.",
                        "Cuide de plantas frágeis em uma estufa que flutua sobre as nuvens. Combine luz, umidade e temperatura para manter o jardim vivo ao longo das estações.",
                        "/imagem-polvojam.jpg", 4.0, 64, 70,
                        List.of("SIMULAÇÃO", "INDIE"), List.of("website", "mobile"), false,
                        LocalDate.of(2026, 11, 13), "jam-polvo-2026-03"),

                jogo("jogo-arquivo-07", "Arquivo 07", "Página Nove",
                        "Mistério de investigação em documentos esquecidos.",
                        "Um jogo de investigação em que você organiza documentos, cruza datas e reconstrói um caso arquivado. Sem combate: só observação e dedução.",
                        "/imagem-insperarte.jpg", 3.9, 52, 66,
                        List.of("MISTÉRIO", "INVESTIGAÇÃO"), List.of("website"), false,
                        LocalDate.of(2026, 11, 12), "jam-polvo-2026-03"),

                jogo("jogo-cidade-submersa", "Cidade Submersa", "Ateliê Norte",
                        "Aventura sobre memória e cidades que afundam.",
                        "Explore uma cidade submersa em ruínas e reconstrua suas histórias por meio de objetos e cartas encontrados nos prédios abandonados.",
                        "/imagem-bgj.jpg", 4.4, 245, 89,
                        List.of("AVENTURA", "NARRATIVA"), List.of("pc", "website"), false,
                        LocalDate.of(2026, 9, 30), null),

                jogo("jogo-orbita-baixa", "Órbita Baixa", "Nave Mãe",
                        "Arcade espacial com manobras rápidas e placares.",
                        "Um arcade de nave espacial focado em manobras precisas, corridas contra o relógio e placares semanais da comunidade.",
                        "/imagem-ggj.png", 4.1, 138, 79,
                        List.of("ARCADE", "AÇÃO"), List.of("pc", "mobile"), false,
                        LocalDate.of(2026, 9, 12), null),

                evento("evento-insperarte", "Insperarte 2026", "Coletivo Insper",
                        "Mostra de jogos, arte digital e experiências interativas.",
                        "Uma mostra que mistura jogos, arte digital e instalações interativas produzidas pela comunidade acadêmica e por convidados independentes.",
                        "/imagem-insperarte.jpg", LocalDate.of(2026, 11, 5), LocalDate.of(2026, 11, 27), LocalDate.of(2026, 11, 29),
                        "São Paulo, SP", 2391, 88, true,
                        List.of("EXPOSIÇÃO", "COMUNIDADE")),

                evento("evento-devs-independentes", "Encontro de Devs Independentes", "Huby",
                        "Rodada de conversas e trocas entre desenvolvedores.",
                        "Um encontro online para compartilhar aprendizados, apresentar protótipos e encontrar parceiros para novos projetos independentes.",
                        "/imagem-ggj.png", LocalDate.of(2026, 11, 1), LocalDate.of(2026, 12, 12), LocalDate.of(2026, 12, 12),
                        "Online", 480, 72, false,
                        List.of("NETWORKING", "ONLINE")),

                evento("evento-mostra-jundu", "Mostra Jundu", "Jundu Studios",
                        "Uma tarde para jogar protótipos e conversar com as equipes.",
                        "A Mostra Jundu abre o estúdio para a comunidade testar protótipos, dar feedback e acompanhar uma conversa sobre o processo criativo dos jogos.",
                        "/imagem-bgj.jpg", LocalDate.of(2026, 10, 22), LocalDate.of(2027, 1, 16), LocalDate.of(2027, 1, 17),
                        "Campinas, SP", 320, 64, false,
                        List.of("MOSTRA", "INDIE")),

                comunidade("comunidade-coletivo-polvo", "Coletivo Polvo", "Coletivo Polvo",
                        "Um coletivo aberto para quem quer criar jams e protótipos em equipe.",
                        "O Coletivo Polvo organiza jams, encontros e grupos de estudo para desenvolvedores, artistas e músicos que querem criar jogos em conjunto.",
                        "/imagem-polvojam.jpg", LocalDate.of(2026, 10, 28), "Online", 3900, 86, true,
                        List.of("GAME JAM", "COLABORAÇÃO")),

                comunidade("comunidade-ggj-brasil", "GGJ Brasil", "GGJ Brasil",
                        "Rede de sedes brasileiras da Global Game Jam.",
                        "Coordena as sedes brasileiras da Global Game Jam, conectando universidades, coletivos e estúdios independentes em todo o país.",
                        "/imagem-ggj.png", LocalDate.of(2026, 8, 20), "Brasil", 12000, 91, false,
                        List.of("COMUNIDADE", "GAME JAM")),

                comunidade("comunidade-huby-devs", "Huby Devs", "Huby",
                        "Comunidade de desenvolvedores, artistas e testers do Huby.",
                        "Um espaço para divulgar devlogs, pedir feedback, encontrar colaboradores e acompanhar as novidades da cena independente.",
                        "/imagem-insperarte.jpg", LocalDate.of(2026, 9, 15), "Online", 850, 74, false,
                        List.of("INDIE", "NETWORKING"))
        ));
    }

    private Conteudo jogo(String id, String titulo, String desenvolvedor, String descricao, String descricaoLonga,
                          String imagem, double nota, int avaliacoes, int relevancia, List<String> tags,
                          List<String> plataformas, boolean destaque, LocalDate dataPublicacao, String gameJamId) {
        Conteudo conteudo = base(id, TipoConteudo.JOGO, titulo, desenvolvedor, descricao, descricaoLonga,
                imagem, tags, dataPublicacao, destaque, relevancia);
        conteudo.setNota(nota);
        conteudo.setAvaliacoes(avaliacoes);
        conteudo.setPlataformas(plataformas);
        conteudo.setGameJamId(gameJamId);
        return conteudo;
    }

    private Conteudo gameJam(String id, String titulo, String organizador, String descricao, String imagem,
                             LocalDate dataPublicacao, LocalDate inicio, LocalDate fim, String local, int participantes,
                             int relevancia, boolean destaque, List<String> tags) {
        Conteudo conteudo = base(id, TipoConteudo.GAME_JAM, titulo, organizador, descricao,
                descricao + " A programação inclui abertura, mentoria, votação da comunidade e publicação dos projetos.",
                imagem, tags, dataPublicacao, destaque, relevancia);
        conteudo.setDataInicio(inicio);
        conteudo.setDataFim(fim);
        conteudo.setLocal(local);
        conteudo.setParticipantes(participantes);
        return conteudo;
    }

    private Conteudo evento(String id, String titulo, String organizador, String descricao, String descricaoLonga,
                            String imagem, LocalDate dataPublicacao, LocalDate inicio, LocalDate fim, String local,
                            int participantes, int relevancia, boolean destaque, List<String> tags) {
        Conteudo conteudo = base(id, TipoConteudo.EVENTO, titulo, organizador, descricao, descricaoLonga,
                imagem, tags, dataPublicacao, destaque, relevancia);
        conteudo.setDataInicio(inicio);
        conteudo.setDataFim(fim);
        conteudo.setLocal(local);
        conteudo.setParticipantes(participantes);
        return conteudo;
    }

    private Conteudo comunidade(String id, String titulo, String organizador, String descricao, String descricaoLonga,
                                String imagem, LocalDate dataPublicacao, String local, int participantes,
                                int relevancia, boolean destaque, List<String> tags) {
        Conteudo conteudo = base(id, TipoConteudo.COMUNIDADE, titulo, organizador, descricao, descricaoLonga,
                imagem, tags, dataPublicacao, destaque, relevancia);
        conteudo.setLocal(local);
        conteudo.setParticipantes(participantes);
        return conteudo;
    }

    private Conteudo base(String id, TipoConteudo tipo, String titulo, String desenvolvedor, String descricao,
                          String descricaoLonga, String imagem, List<String> tags, LocalDate dataPublicacao,
                          boolean destaque, int relevancia) {
        Conteudo conteudo = new Conteudo();
        conteudo.setId(id);
        conteudo.setTipo(tipo);
        conteudo.setTitulo(titulo);
        conteudo.setDesenvolvedor(desenvolvedor);
        conteudo.setDescricao(descricao);
        conteudo.setDescricaoLonga(descricaoLonga);
        conteudo.setImagem(imagem);
        conteudo.setTags(tags);
        conteudo.setDataPublicacao(dataPublicacao);
        conteudo.setDestaque(destaque);
        conteudo.setRelevancia(relevancia);
        return conteudo;
    }
}
