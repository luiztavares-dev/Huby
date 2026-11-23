package com.example.loginsimples;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Popula a coleção de conteúdos com dados fictícios.
 * Na primeira execução salva todos os documentos; nas seguintes, adiciona os que
 * faltam e completa os detalhes de eventos e comunidades criados antes do recurso existir.
 */
@Component
public class DataSeeder implements CommandLineRunner {

    private final ConteudoRepository repository;
    private final FuncaoEquipeRepository funcaoRepository;
    private final UsuarioRepository usuarioRepository;

    @Value("${huby.seed.enabled:true}")
    private boolean seedEnabled;

    private static final List<String> CARGOS_SEED = List.of("DONO", "ADMIN", "MEMBRO", "MEMBRO");

    private static final String[] PEDIDOS_SEED = {
            "Estou procurando gente pra testar meu jogo e quero ajudar nos outros também.",
            "Trabalho com arte 2D e gostaria de participar das jams da comunidade."
    };

    private static final String[] ASSUNTOS_SEED = {
            "Boa! Fechei o protótipo que comecei no último encontro e o feedback de vocês salvou o projeto.",
            "Estou com dúvida sobre exportar pra navegador. Alguém já subiu build no Huby com WebGL?",
            "Abri um tópico de oferta de colaboração. Tenho programador sobrando e falta artista pra duas ideias.",
            "Encontro da semana que vem vai ser sobre balanceamento. Trouxeram um caso real do jogo de plataforma?"
    };

    public DataSeeder(ConteudoRepository repository,
                      FuncaoEquipeRepository funcaoRepository,
                      UsuarioRepository usuarioRepository) {
        this.repository = repository;
        this.funcaoRepository = funcaoRepository;
        this.usuarioRepository = usuarioRepository;
    }

    @Override
    public void run(String... args) {
        if (!seedEnabled) {
            return;
        }

        semearFuncoes();

        List<Conteudo> seeds = montarSeeds();

        if (repository.count() == 0) {
            repository.saveAll(seeds);
            return;
        }

        for (Conteudo seed : seeds) {
            Optional<Conteudo> existente = repository.findById(seed.getId());

            if (existente.isEmpty()) {
                repository.save(seed);
                continue;
            }

            Conteudo atual = existente.get();
            boolean precisaDetalhes = atual.getInscricoesAte() == null && seed.getInscricoesAte() != null;
            boolean precisaTamanho = atual.getTamanhoEquipe() == null && seed.getTamanhoEquipe() != null;
            boolean precisaModelo = seed.getModeloEquipe() != null
                    && !seed.getModeloEquipe().equals(atual.getModeloEquipe());
            boolean precisaPreco = seed.getTipo() == TipoConteudo.JOGO
                    && !seed.getPreco().equals(atual.getPreco());
            boolean precisaPlataformas = seed.getTipo() == TipoConteudo.JOGO
                    && (atual.getPlataformas() == null
                        || !seed.getPlataformas().equals(atual.getPlataformas()));

            if (precisaDetalhes || precisaTamanho || precisaModelo || precisaPreco || precisaPlataformas) {
                if (precisaDetalhes) {
                    atual.setTema(seed.getTema());
                    atual.setInscricoesAte(seed.getInscricoesAte());
                    atual.setPremios(seed.getPremios());
                    atual.setCronograma(seed.getCronograma());
                    atual.setRegras(seed.getRegras());
                    atual.setComentarios(seed.getComentarios());
                    atual.setEquipes(seed.getEquipes());
                    atual.setEquipesInscritas(seed.getEquipesInscritas());
                }

                if (precisaTamanho) {
                    atual.setTamanhoEquipe(seed.getTamanhoEquipe());
                }

                if (precisaModelo) {
                    atual.setModeloEquipe(seed.getModeloEquipe());
                }

                if (precisaPreco) {
                    atual.setPreco(seed.getPreco());
                }

                if (precisaPlataformas) {
                    atual.setPlataformas(seed.getPlataformas());
                }

                repository.save(atual);
            }
        }

        semearComunidades();
    }

    /**
     * Completa as comunidades criadas antes da gestão de membros existir:
     * cargos reais, pedidos pendentes e publicações no fórum.
     */
    private void semearComunidades() {
        List<Usuario> usuarios = new ArrayList<>(usuarioRepository.findAll());
        int janela = CARGOS_SEED.size() + PEDIDOS_SEED.length;

        if (usuarios.size() < janela) {
            return;
        }

        usuarios.sort(Comparator.comparing(usuario -> usuario.getId() == null ? "" : usuario.getId()));

        int cursor = 0;

        for (Conteudo comunidade : repository.findByTipoOrderByRelevanciaDescNotaDesc(TipoConteudo.COMUNIDADE)) {
            boolean semMembros = comunidade.getMembros() == null || comunidade.getMembros().isEmpty();
            boolean semPublicacoes = comunidade.getComentarios() == null || comunidade.getComentarios().isEmpty();

            if (!semMembros && !semPublicacoes) {
                continue;
            }

            if (semMembros) {
                comunidade.setMembros(novosMembros(usuarios, cursor));
                comunidade.setDonoId(comunidade.getMembros().get(0).getUsuarioId());
                comunidade.setSolicitacoes(novosPedidos(usuarios, cursor + CARGOS_SEED.size()));
            }

            if (semPublicacoes) {
                comunidade.setComentarios(novasPublicacoes(comunidade, usuarios, cursor));
            }

            repository.save(comunidade);
            cursor += janela;
        }
    }

    private List<IntegranteComunidade> novosMembros(List<Usuario> usuarios, int inicio) {
        List<IntegranteComunidade> membros = new ArrayList<>();
        LocalDate hoje = LocalDate.now();

        for (int i = 0; i < CARGOS_SEED.size(); i++) {
            Usuario usuario = usuarioNaPosicao(usuarios, inicio + i);
            IntegranteComunidade membro = new IntegranteComunidade(
                    usuario.getId(), usuario.getUsername(), avatarDe(usuario), CARGOS_SEED.get(i));
            membro.setEntrouEm(hoje.minusDays((long) (CARGOS_SEED.size() - i) * 11));
            membros.add(membro);
        }

        return membros;
    }

    private List<SolicitacaoComunidade> novosPedidos(List<Usuario> usuarios, int inicio) {
        List<SolicitacaoComunidade> pedidos = new ArrayList<>();
        LocalDate hoje = LocalDate.now();

        for (int i = 0; i < PEDIDOS_SEED.length; i++) {
            Usuario usuario = usuarioNaPosicao(usuarios, inicio + i);
            SolicitacaoComunidade pedido = new SolicitacaoComunidade(
                    "solicitacao-" + usuario.getId(),
                    usuario.getId(),
                    usuario.getUsername(),
                    avatarDe(usuario),
                    PEDIDOS_SEED[i]);
            pedido.setCriadoEm(hoje.minusDays((long) i + 1));
            pedidos.add(pedido);
        }

        return pedidos;
    }

    private List<ComentarioConteudo> novasPublicacoes(Conteudo comunidade, List<Usuario> usuarios, int inicio) {
        List<ComentarioConteudo> publicacoes = new ArrayList<>();
        LocalDate hoje = LocalDate.now();

        for (int i = 0; i < ASSUNTOS_SEED.length; i++) {
            Usuario autor = usuarioNaPosicao(usuarios, inicio + i);
            String texto = ASSUNTOS_SEED[(inicio + i) % ASSUNTOS_SEED.length];
            int curtidas = 8 + ((inicio + i) * 7) % 41;
            List<ComentarioConteudo> respostas = new ArrayList<>();

            if (i == 1) {
                Usuario respondente = usuarioNaPosicao(usuarios, inicio + 2);
                respostas.add(new ComentarioConteudo(
                        "publicacao-" + comunidade.getId() + "-" + i + "-r",
                        nomeDe(respondente), handleDe(respondente), avatarDe(respondente),
                        "Também passei por isso. Achei que era o projeto, mas era só o costume de salvar no fim.",
                        Math.max(1, curtidas / 3), hoje.minusDays(15L), List.of()));
            }

            publicacoes.add(new ComentarioConteudo(
                    "publicacao-" + comunidade.getId() + "-" + i,
                    nomeDe(autor), handleDe(autor), avatarDe(autor), texto, curtidas,
                    hoje.minusDays(18L - i * 4L), respostas));
        }

        return publicacoes;
    }

    private Usuario usuarioNaPosicao(List<Usuario> usuarios, int posicao) {
        return usuarios.get(Math.floorMod(posicao, usuarios.size()));
    }

    private String avatarDe(Usuario usuario) {
        String avatar = usuario.getAvatarUrl() == null ? "" : usuario.getAvatarUrl().trim();
        return avatar.isEmpty() ? "/icon-perfil.png" : avatar;
    }

    private String nomeDe(Usuario usuario) {
        if (usuario.getNomeExibicao() != null && !usuario.getNomeExibicao().isBlank()) {
            return usuario.getNomeExibicao();
        }
        return usuario.getUsername() == null ? "Alguém" : usuario.getUsername();
    }

    private String handleDe(Usuario usuario) {
        return "@" + (usuario.getUsername() == null ? "" : usuario.getUsername());
    }

    /** Funções disponíveis no select de integrantes da inscrição de equipe. */
    private void semearFuncoes() {
        for (FuncaoEquipe funcao : funcoesSeeds()) {
            if (funcaoRepository.findById(funcao.getId()).isEmpty()) {
                funcaoRepository.save(funcao);
            }
        }
    }

    private List<FuncaoEquipe> funcoesSeeds() {
        return List.of(
                new FuncaoEquipe("funcao-programador", "Programador", 1),
                new FuncaoEquipe("funcao-artista-2d", "Artista 2D", 2),
                new FuncaoEquipe("funcao-artista-3d", "Artista 3D", 3),
                new FuncaoEquipe("funcao-ilustrador", "Ilustrador", 4),
                new FuncaoEquipe("funcao-compositor", "Compositor", 5),
                new FuncaoEquipe("funcao-sound-designer", "Sound Designer", 6),
                new FuncaoEquipe("funcao-roteirista", "Roteirista", 7),
                new FuncaoEquipe("funcao-game-designer", "Game Designer", 8),
                new FuncaoEquipe("funcao-level-designer", "Level Designer", 9),
                new FuncaoEquipe("funcao-produtor", "Produtor", 10),
                new FuncaoEquipe("funcao-tester", "Tester", 11)
        );
    }

    private List<Conteudo> montarSeeds() {
        List<Conteudo> seeds = new ArrayList<>(List.of(
                detalhes(
                        gameJam("jam-polvo-2026-03", "Polvo Jam 2026.03", "Estúdio Polvo",
                                "Terceira edição da jam do Estúdio Polvo: 48 horas para transformar um tema surpresa em um protótipo jogável.",
                                "/imagem-polvojam.jpg", LocalDate.of(2026, 10, 15), LocalDate.of(2026, 11, 13), LocalDate.of(2026, 11, 15),
                                "Online", 1240, 95, false,
                                List.of("GAME JAM", "COMUNIDADE")),
                        "Um planeta adormecido precisa de vida nova",
                        LocalDate.of(2026, 11, 10),
                        List.of(
                                premio(1, "R$ 800", "Publicação em destaque no Huby e mentoria com o Estúdio Polvo"),
                                premio(2, "R$ 400", "Mentoria de produção e trilha sonora"),
                                premio(3, "R$ 200", "Kit de divulgação para o projeto")
                        ),
                        List.of(
                                etapa("Abertura e revelação do tema", "13 NOV · 20:00"),
                                etapa("Desenvolvimento livre", "14 NOV · 09:00 – 23:00"),
                                etapa("Entrega dos protótipos", "15 NOV · 09:00 – 18:00"),
                                etapa("Votação e premiação", "15 NOV · 20:00")
                        ),
                        List.of(
                                "Equipes de até 4 pessoas, com pelo menos uma pessoa responsável pelo envio.",
                                "Todo o código e a arte devem ser criados durante a jam. Assets livres precisam ser creditados.",
                                "O protótipo precisa rodar no navegador ou ter um vídeo de até 2 minutos.",
                                "Projetos que usarem conteúdo de terceiros sem crédito serão desclassificados."
                        ),
                        List.of("Semente Zero", "Coral em Fluxo", "Ruído Branco", "Linha de Maré", "Jardim de Vidro", "Arquivo 07"),
                        148,
                        List.of(
                                comentario("c-polvo-1", "Marina Alves", "@marinaalv", "A revelação do tema foi surreal. Já quero ver os protótipos de vocês!", 42, LocalDate.of(2026, 11, 14),
                                        comentario("c-polvo-1-1", "Coletivo Polvo", "@coletivopolvo", "Obrigado por participar, Marina! A mostra vem aí.", 12, LocalDate.of(2026, 11, 14))),
                                comentario("c-polvo-2", "Tomás Ribeiro", "@tomasribeiro", "Consegui fechar meu protótipo às 17h58. Foi por pouco!", 27, LocalDate.of(2026, 11, 15)),
                                comentario("c-polvo-3", "Ana Prado", "@anaprado", "A organização mandou muito bem no suporte durante a madrugada.", 18, LocalDate.of(2026, 11, 16))
                        )
                ),
                detalhes(
                        gameJam("jam-global-2026", "Global Game Jam 2026", "GGJ Foundation",
                                "A maior jam presencial do mundo reúne sedes em todo o planeta para criar jogos em um fim de semana.",
                                "/imagem-ggj.png", LocalDate.of(2026, 1, 5), LocalDate.of(2026, 1, 30), LocalDate.of(2026, 2, 1),
                                "Presencial e online", 5800, 90, false,
                                List.of("GAME JAM", "MUNDIAL")),
                        "Roots — raízes",
                        LocalDate.of(2026, 1, 25),
                        List.of(),
                        List.of(
                                etapa("Credenciamento nas sedes", "30 JAN · 10:00"),
                                etapa("Revelação do tema e formação de equipes", "30 JAN · 17:00"),
                                etapa("Desenvolvimento", "30 JAN · 18:00 – 01 FEV · 15:00"),
                                etapa("Apresentação dos jogos", "01 FEV · 16:00")
                        ),
                        List.of(
                                "É obrigatório participar de uma sede oficial ou da modalidade online.",
                                "Todos os membros da equipe precisam estar inscritos antes do início da jam.",
                                "O jogo deve ser criado integralmente durante o evento.",
                                "O tema precisa estar presente no jogo de forma reconhecível."
                        ),
                        List.of("Root Keepers", "Sede Recife", "Sede Curitiba", "Sede Online", "Sede Porto Alegre"),
                        920,
                        List.of(
                                comentario("c-ggj-1", "Pedro Lima", "@pedrolima", "Minha primeira GGJ foi inesquecível. Já estou contando os dias para 2026.", 56, LocalDate.of(2026, 1, 12)),
                                comentario("c-ggj-2", "Sede Curitiba", "@sedecuritiba", "Estamos preparando uma estrutura ainda maior esse ano. Nos vemos lá!", 34, LocalDate.of(2026, 1, 18))
                        )
                ),
                detalhes(
                        gameJam("jam-brasil-2026", "Brasil Game Jam 2026", "BJam Org",
                                "Maratona nacional de criação de jogos com mentorias, palestras e premiação para os projetos mais criativos.",
                                "/imagem-bgj.jpg", LocalDate.of(2026, 7, 1), LocalDate.of(2026, 8, 7), LocalDate.of(2026, 8, 9),
                                "São Paulo, SP", 3120, 84, false,
                                List.of("GAME JAM", "BRASIL")),
                        "Festas e tradições brasileiras",
                        LocalDate.of(2026, 8, 1),
                        List.of(
                                premio(1, "R$ 2.000", "Aceleração de 3 meses com parceiros da BJam"),
                                premio(2, "R$ 1.000", "Mentoria de mercado e publicação"),
                                premio(3, "R$ 500", "Kit de hardware para prototipagem")
                        ),
                        List.of(
                                etapa("Abertura e talks", "07 AGO · 09:00 – 18:00"),
                                etapa("Revelação do tema", "07 AGO · 19:00"),
                                etapa("Desenvolvimento", "07 AGO · 20:00 – 09 AGO · 16:00"),
                                etapa("Pitch e premiação", "09 AGO · 18:00")
                        ),
                        List.of(
                                "Equipes de 2 a 6 pessoas, com pelo menos uma pessoa maior de 18 anos.",
                                "Todo o material enviado precisa ser de autoria da equipe.",
                                "O pitch final tem 3 minutos e não pode usar vídeos prontos.",
                                "Projetos devem funcionar em Windows ou navegador."
                        ),
                        List.of("Tucupi Team", "Forró Digital", "Bumba Meu Game", "Frevo Bytes", "Mandacaru Studio"),
                        210,
                        List.of(
                                comentario("c-bgj-1", "Lívia Santos", "@liviasantos", "A mentoria de mercado valeu cada minuto. Aprendi mais em um fim de semana do que em meses.", 48, LocalDate.of(2026, 8, 8)),
                                comentario("c-bgj-2", "Rafael Nunes", "@rafanunes", "Alguém já tem o link da playlist das talks? Quero rever a de publicação.", 21, LocalDate.of(2026, 8, 10),
                                        comentario("c-bgj-2-1", "BJam Org", "@bjamorg", "Vamos publicar ainda esta semana no nosso perfil!", 9, LocalDate.of(2026, 8, 10)))
                        )
                ),

                jogo("jogo-silksong", "Hollow Knight: Silksong", "Team Cherry",
                        "Ação e aventura metroidvania no reino de Pharloom.",
                        "No controle de Hornet, o jogador explora um reino desconhecido cheio de perigos, enfrenta criaturas desafiadoras e descobre novas habilidades em uma jornada até o pico do mundo.",
                        "/Silksong.png", 4.8, 582, 98,
                        List.of("AVENTURA", "METROIDVANIA"), List.of("pc"), true,
                        LocalDate.of(2026, 11, 18), null),

                jogo("jogo-jundu", "Jundu's Sprouts", "Jundu Studios",
                        "Plataforma 2D sobre um pequeno alienígena e suas sementes.",
                        "Controle Jundu, um pequeno alienígena que precisa coletar sementes e evitar obstáculos para salvar seu planeta natal em uma aventura de plataforma cheia de personalidade.",
                        "/imagem-insperarte.jpg", 4.6, 312, 94,
                        List.of("PLATAFORMA", "PIXEL ART"), List.of("pc"), true,
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
                        List.of("AVENTURA", "EXPLORAÇÃO"), List.of("pc"), false,
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
                        List.of("AVENTURA", "NARRATIVA"), List.of("pc"), false,
                        LocalDate.of(2026, 9, 30), null),

                jogo("jogo-orbita-baixa", "Órbita Baixa", "Nave Mãe",
                        "Arcade espacial com manobras rápidas e placares.",
                        "Um arcade de nave espacial focado em manobras precisas, corridas contra o relógio e placares semanais da comunidade.",
                        "/imagem-ggj.png", 4.1, 138, 79,
                        List.of("ARCADE", "AÇÃO"), List.of("pc", "mobile"), false,
                        LocalDate.of(2026, 9, 12), null),

                jogo("jogo-brasa-de-vidro", "Brasa de Vidro", "Forja Sul",
                        "Roguelike de ação em uma forja que nunca apaga.",
                        "Explore uma forja que muda a cada noite, combine armas improvisadas e enfrente guardiões feitos de vidro e brasas. Cada derrota deixa uma nova pista para a próxima expedição.",
                        "/imagem-ggj.png", 4.7, 286, 97,
                        List.of("AÇÃO", "ROGUELIKE"), List.of("pc"), true,
                        LocalDate.of(2026, 11, 22), null),

                jogo("jogo-mapa-de-areia", "Mapa de Areia", "Duna Digital",
                        "Estratégia em turnos para desenhar rotas no deserto.",
                        "Reúna uma caravana, registre fontes de água e escolha caminhos seguros por um deserto que se transforma a cada tempestade. Cada decisão altera o mapa e o destino da jornada.",
                        "/imagem-polvojam.jpg", 4.6, 194, 95,
                        List.of("ESTRATÉGIA", "TBS"), List.of("pc"), true,
                        LocalDate.of(2026, 11, 21), null),

                jogo("jogo-piquenique-sideral", "Piquenique Sideral", "Lua Baixa",
                        "Party game com receitas, caos e gravidade zero.",
                        "Organize um piquenique interestelar com até quatro pessoas. Prepare receitas malucas, desvie de cometas e mantenha a comida flutuando longe dos vizinhos mais famintos.",
                        "/imagem-insperarte.png", 4.5, 176, 93,
                        List.of("CASUAL", "PARTY"), List.of("pc", "mobile"), true,
                        LocalDate.of(2026, 11, 20), null),

                jogo("jogo-coracao-de-cobre", "Coração de Cobre", "Oficina do Vento",
                        "Narrativa interativa sobre memórias de uma cidade mecânica.",
                        "Restaude relógios, oficinas e praças de uma cidade movida a cordas e engrenagens. Ao consertar suas máquinas, você reconstrói a história das pessoas que ainda moram ali.",
                        "/imagem-bgj.jpg", 4.4, 142, 91,
                        List.of("NARRATIVA", "AVENTURA"), List.of("website", "pc"), true,
                        LocalDate.of(2026, 11, 19), null),

                jogo("jogo-vale-das-engrenagens", "Vale das Engrenagens", "Torno Norte",
                        "Gestão de uma pequena vila movida a energia.",
                        "Transforme um vale abandonado em uma comunidade autossustentável. Equilibre produção, moradia e descanso enquanto descobre maneiras criativas de aproveitar cada fonte de energia.",
                        "/imagem-polvojam.jpg", 4.2, 118, 87,
                        List.of("GESTÃO", "ESTRATÉGIA"), List.of("pc"), false,
                        LocalDate.of(2026, 11, 18), null),

                jogo("jogo-entre-trens", "Entre Trens", "Trilho Curto",
                        "Exploração serena por estações e histórias esquecidas.",
                        "Viaje por uma ferrovia costeira e ajude cada estação a reencontrar seu propósito. Converse com passageiros, encontre objetos perdidos e escolha quais destinos merecem uma nova parada.",
                        "/imagem-insperarte.png", 4.3, 86, 84,
                        List.of("AVENTURA", "EXPLORAÇÃO"), List.of("pc"), false,
                        LocalDate.of(2026, 11, 17), null),

                jogo("jogo-sob-pressao", "Sob Pressão", "Fundo do Mar",
                        "Sobrevivência em uma base subaquática sem energia.",
                        "Administre oxigênio, alimentos e reparos em uma base isolada no fundo do mar. O oceano guarda respostas para o apagão, mas cada mergulho pode ser o último.",
                        "/imagem-ggj.png", 4.1, 104, 82,
                        List.of("SOBREVIVÊNCIA", "HORROR"), List.of("pc"), true,
                        LocalDate.of(2026, 11, 16), null),

                jogo("jogo-cartas-de-marte", "Cartas de Marte", "Órbita Vermelha",
                        "Deckbuilding tático para colonizar um planeta hostil.",
                        "Monte um baralho de expedições, estruturas e descobertas para estabelecer a primeira colônia em Marte. Combine cartas para enfrentar tempestades e manter a equipe unida.",
                        "/imagem-bgj.jpg", 4.0, 68, 76,
                        List.of("DECKBUILDING", "ESTRATÉGIA"), List.of("website", "pc"), false,
                        LocalDate.of(2026, 11, 11), null),

                detalhes(
                        evento("evento-insperarte", "Insperarte 2026", "Coletivo Insper",
                                "Mostra de jogos, arte digital e experiências interativas.",
                                "Uma mostra que mistura jogos, arte digital e instalações interativas produzidas pela comunidade acadêmica e por convidados independentes.",
                                "/imagem-insperarte.jpg", LocalDate.of(2026, 11, 5), LocalDate.of(2026, 11, 27), LocalDate.of(2026, 11, 29),
                                "São Paulo, SP", 2391, 88, true,
                                List.of("EXPOSIÇÃO", "COMUNIDADE")),
                        "Arte, jogos e experiências interativas",
                        LocalDate.of(2026, 11, 22),
                        List.of(
                                premio(1, "R$ 1.500", "Destaque na home do Huby e convite para a próxima edição"),
                                premio(2, "R$ 800", "Mentoria de produção com o Coletivo Insper"),
                                premio(3, "R$ 400", "Kit de divulgação e cobertura do projeto")
                        ),
                        List.of(
                                etapa("Abertura e credenciamento", "27 NOV · 18:00 – 21:00"),
                                etapa("Mostra aberta ao público", "28 NOV · 10:00 – 20:00"),
                                etapa("Rodada de feedbacks", "29 NOV · 14:00 – 17:00"),
                                etapa("Premiação e encerramento", "29 NOV · 19:00")
                        ),
                        List.of(
                                "As inscrições são por equipe, com até 5 integrantes.",
                                "Cada equipe pode inscrever no máximo dois projetos.",
                                "As experiências precisam ser jogáveis no local durante a mostra.",
                                "Materiais de terceiros devem respeitar licenças de uso.",
                                "A organização pode remanejar horários de apresentação conforme a demanda."
                        ),
                        List.of("Estúdio Aurora", "Núcleo Vidro", "Coletivo Ruído", "Time Insper", "Página Nove"),
                        312,
                        List.of(
                                comentario("c-insp-1", "Júlia Ferraz", "@juliaferraz", "Visitei a edição passada e a curadoria estava impecável. Já fiz minha inscrição!", 87, LocalDate.of(2026, 11, 12),
                                        comentario("c-insp-1-1", "Coletivo Insper", "@coletivoinsper", "Que bom ter você de volta, Júlia! Essa edição vem ainda mais diversa.", 23, LocalDate.of(2026, 11, 12)),
                                        comentario("c-insp-1-2", "Caio Mendes", "@caiomendes", "Também vou! Vamos combinar de trocar feedbacks no segundo dia.", 11, LocalDate.of(2026, 11, 13))),
                                comentario("c-insp-2", "Beatriz Rocha", "@biarocha", "O prazo de inscrição está bem apertado. Dá para enviar o build depois?", 19, LocalDate.of(2026, 11, 15),
                                        comentario("c-insp-2-1", "Coletivo Insper", "@coletivoinsper", "Pode enviar o build final até 26/11. Só a inscrição precisa ser feita até 22.", 16, LocalDate.of(2026, 11, 15))),
                                comentario("c-insp-3", "Diego Martins", "@diegomartins", "Alguém procurando artista para pixel art? Tenho portfólio e quero entrar em uma equipe.", 33, LocalDate.of(2026, 11, 18))
                        )
                ),

                detalhes(
                        evento("evento-devs-independentes", "Encontro de Devs Independentes", "Huby",
                                "Rodada de conversas e trocas entre desenvolvedores.",
                                "Um encontro online para compartilhar aprendizados, apresentar protótipos e encontrar parceiros para novos projetos independentes.",
                                "/imagem-ggj.png", LocalDate.of(2026, 11, 1), LocalDate.of(2026, 12, 12), LocalDate.of(2026, 12, 12),
                                "Online", 480, 72, false,
                                List.of("NETWORKING", "ONLINE")),
                        "Compartilhar, testar e colaborar",
                        LocalDate.of(2026, 12, 5),
                        List.of(),
                        List.of(
                                etapa("Abertura e apresentações", "12 DEZ · 14:00"),
                                etapa("Rodada de protótipos", "12 DEZ · 15:30"),
                                etapa("Mesa sobre financiamento", "12 DEZ · 17:00"),
                                etapa("Networking aberto", "12 DEZ · 18:30")
                        ),
                        List.of(
                                "O encontro acontece online, com link enviado por e-mail.",
                                "Quem quiser apresentar um protótipo deve indicar isso na inscrição.",
                                "As salas de networking ficam abertas até 21h."
                        ),
                        List.of("Mesa Redonda", "Sala de Protótipos", "Roda de Artistas", "Grupo de Estudos"),
                        48,
                        List.of(
                                comentario("c-devs-1", "Renata Lopes", "@retalopes", "A mesa sobre financiamento foi o que eu mais precisava ouvir esse ano.", 26, LocalDate.of(2026, 11, 3)),
                                comentario("c-devs-2", "Vitor Hugo", "@vhugo", "Tem espaço para apresentar um protótipo ainda em fase de ideia?", 14, LocalDate.of(2026, 11, 6),
                                        comentario("c-devs-2-1", "Huby", "@huby", "Tem sim! A rodada de protótipos aceita projetos em qualquer estágio.", 10, LocalDate.of(2026, 11, 6)))
                        )
                ),

                detalhes(
                        evento("evento-mostra-jundu", "Mostra Jundu", "Jundu Studios",
                                "Uma tarde para jogar protótipos e conversar com as equipes.",
                                "A Mostra Jundu abre o estúdio para a comunidade testar protótipos, dar feedback e acompanhar uma conversa sobre o processo criativo dos jogos.",
                                "/imagem-bgj.jpg", LocalDate.of(2026, 10, 22), LocalDate.of(2027, 1, 16), LocalDate.of(2027, 1, 17),
                                "Campinas, SP", 320, 64, false,
                                List.of("MOSTRA", "INDIE")),
                        "Prototipar em público",
                        LocalDate.of(2027, 1, 8),
                        List.of(),
                        List.of(
                                etapa("Abertura do estúdio", "16 JAN · 13:00"),
                                etapa("Sessão de testes", "16 JAN · 14:00 – 18:00"),
                                etapa("Conversa sobre processo criativo", "17 JAN · 10:00"),
                                etapa("Feedback coletivo", "17 JAN · 15:00")
                        ),
                        List.of(
                                "As vagas para testes são limitadas e confirmadas por ordem de inscrição.",
                                "Menores de 16 anos precisam estar acompanhados por um responsável.",
                                "Fotos e vídeos do evento podem ser usados na divulgação do estúdio."
                        ),
                        List.of("Equipe Jundu", "Visitantes", "Testers convidados", "Imprensa"),
                        22,
                        List.of(
                                comentario("c-jundu-1", "Sofia Barreto", "@sofiabarreto", "A mostra do ano passado foi ótima para conhecer o processo de vocês.", 22, LocalDate.of(2026, 11, 2)),
                                comentario("c-jundu-2", "André Costa", "@andrecosta", "Vou levar meu protótipo para testar com o público. Alguém mais?", 9, LocalDate.of(2026, 11, 9))
                        )
                ),

                detalhes(
                        evento("evento-pixel-fest", "Pixel Fest 2026", "Coletivo Pixel",
                                "Festival de pixel art, jogos experimentais e oficinas abertas.",
                                "Dois dias de mostras, oficinas e conversas sobre pixel art e jogos experimentais. O festival ocupa o centro do Recife com uma programação gratuita para toda a comunidade.",
                                "/imagem-ggj.png", LocalDate.of(2026, 10, 30), LocalDate.of(2026, 11, 28), LocalDate.of(2026, 11, 29),
                                "Recife, PE", 890, 82, false,
                                List.of("FESTIVAL", "PIXEL ART")),
                        "Pixel art e jogos experimentais",
                        LocalDate.of(2026, 11, 24),
                        List.of(
                                premio(1, "R$ 600", "Espaço garantido na mostra do próximo ano"),
                                premio(2, "R$ 300", "Mentoria de animação pixel art"),
                                premio(3, "Kit de materiais", "Tablet de desenho e licenças de software")
                        ),
                        List.of(
                                etapa("Abertura do festival", "28 NOV · 10:00"),
                                etapa("Oficinas de pixel art", "28 NOV · 13:00 – 17:00"),
                                etapa("Mostra de jogos", "29 NOV · 11:00 – 17:00"),
                                etapa("Premiação e encerramento", "29 NOV · 18:00")
                        ),
                        List.of(
                                "Inscrições gratuitas, com vagas limitadas por oficina.",
                                "Cada projeto inscrito deve caber em uma mesa de 1m x 1m.",
                                "Equipamentos de som precisam usar fones de ouvido.",
                                "A organização fornece energia e internet, mas não monitores."
                        ),
                        List.of("Pixel Recife", "Studio 8bits", "Ateliê Colorido", "Gameboys do Recife", "Tela Quente"),
                        36,
                        List.of(
                                comentario("c-pixel-1", "Lucas Andrade", "@lucasandrade", "Recife precisava de um festival assim. Já garanti minha vaga na oficina de animação.", 31, LocalDate.of(2026, 11, 8)),
                                comentario("c-pixel-2", "Iara Melo", "@iaramelo", "As oficinas são para iniciantes também?", 17, LocalDate.of(2026, 11, 11),
                                        comentario("c-pixel-2-1", "Coletivo Pixel", "@coletivopixel", "São sim! Tem turma iniciante no sábado à tarde.", 13, LocalDate.of(2026, 11, 11))),
                                comentario("c-pixel-3", "Bruno Carvalho", "@brunocarvalho", "Vou levar um protótipo de plataforma 2D para a mostra.", 12, LocalDate.of(2026, 11, 17))
                        )
                ),

                detalhes(
                        gameJam("jam-da-mare-2026", "Jam da Maré 2026", "Coletivo Maré",
                                "Uma jam online de 48 horas com tema revelado na abertura. A proposta é transformar memórias, lendas e paisagens costeiras em protótipos jogáveis.",
                                "/imagem-bgj.jpg", LocalDate.of(2026, 10, 20), LocalDate.of(2026, 12, 4), LocalDate.of(2026, 12, 6),
                                "Online", 640, 80, false,
                                List.of("GAME JAM", "NARRATIVA")),
                        "Histórias e memórias do mar",
                        LocalDate.of(2026, 11, 28),
                        List.of(
                                premio(1, "R$ 700", "Publicação na vitrine do Coletivo Maré"),
                                premio(2, "R$ 350", "Mentoria de narrativa e level design"),
                                premio(3, "R$ 150", "Kit de trilha sonora")
                        ),
                        List.of(
                                etapa("Abertura e revelação do tema", "04 DEZ · 19:00"),
                                etapa("Desenvolvimento", "04 DEZ · 20:00 – 06 DEZ · 14:00"),
                                etapa("Envio dos protótipos", "06 DEZ · 14:00 – 17:00"),
                                etapa("Avaliação e resultado", "06 DEZ · 20:00")
                        ),
                        List.of(
                                "Equipes de até 5 pessoas, todas inscritas até o prazo.",
                                "O projeto precisa ser criado do zero durante a jam.",
                                "Textos e músicas de terceiros devem ter licença livre e crédito.",
                                "O envio final é um build executável ou link jogável."
                        ),
                        List.of("Maré Alta", "Sereia Studio", "Recife Submerso", "Farol Coletivo", "Correnteza"),
                        74,
                        List.of(
                                comentario("c-mare-1", "Camila Duarte", "@camiladuarte", "Já estou com uma ideia de jogo sobre memórias de pescadores. Vamos ver no que dá!", 24, LocalDate.of(2026, 11, 14)),
                                comentario("c-mare-2", "Ravi Monteiro", "@ravimonteiro", "Alguém quer formar equipe? Faço trilha e sound design.", 29, LocalDate.of(2026, 11, 16))
                        )
                ),

                detalhes(
                        gameJam("jam-ludum-dare-60", "Ludum Dare 60", "Ludum Dare",
                                "A edição 60 da maior jam online do mundo convida criadores de todos os níveis a produzir um jogo completo em 72 horas a partir de um tema votado pela comunidade.",
                                "/imagem-insperarte.jpg", LocalDate.of(2026, 11, 10), LocalDate.of(2026, 12, 18), LocalDate.of(2026, 12, 20),
                                "Online", 12800, 93, true,
                                List.of("GAME JAM", "MUNDIAL")),
                        "Tema votado e revelado na abertura",
                        LocalDate.of(2026, 12, 15),
                        List.of(),
                        List.of(
                                etapa("Votação de temas", "15 DEZ · 12:00"),
                                etapa("Abertura e revelação", "18 DEZ · 18:00"),
                                etapa("Desenvolvimento", "18 DEZ · 19:00 – 20 DEZ · 18:59"),
                                etapa("Avaliação da comunidade", "20 DEZ · 20:00")
                        ),
                        List.of(
                                "Você pode participar sozinho ou em equipe, sem limite de integrantes.",
                                "O jogo deve ser feito do zero durante a jam.",
                                "É obrigatório avaliar pelo menos 3 jogos de outros participantes.",
                                "Conteúdo gerado por IA deve ser declarado na página do projeto."
                        ),
                        List.of("Lone Wolf", "Team Pixel", "Night Owls", "Jam Machine", "Coffee & Code", "Moon Studio"),
                        980,
                        List.of(
                                comentario("c-ludum-1", "Henrique Souza", "@hsouza", "Preparei meu cronograma de 72 horas. Café comprado, ideia anotada, equipe avisada.", 63, LocalDate.of(2026, 11, 12),
                                        comentario("c-ludum-1-1", "Nina Rocha", "@ninarocha", "Boa sorte! Vou participar pela primeira vez.", 14, LocalDate.of(2026, 11, 13))),
                                comentario("c-ludum-2", "Otávio Reis", "@otavioreis", "A votação de tema é quase tão divertida quanto a jam em si.", 38, LocalDate.of(2026, 11, 15)),
                                comentario("c-ludum-3", "Lara Pires", "@larapires", "Alguém sabe se pode usar engine própria? Nunca testei nessa jam.", 20, LocalDate.of(2026, 11, 18))
                        )
                ),

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

        Map<String, Integer> tamanhosEquipe = Map.of(
                "evento-insperarte", 5,
                "evento-mostra-jundu", 3
        );

        Map<String, String> modelosEquipe = Map.of(
                "jam-da-mare-2026", "SURPRESA",
                "jam-ludum-dare-60", "INDIVIDUAL"
        );

        Map<String, Double> precosJogos = Map.ofEntries(
                Map.entry("jogo-silksong", 19.90),
                Map.entry("jogo-jundu", 7.90),
                Map.entry("jogo-semente-zero", 0.0),
                Map.entry("jogo-coral-em-fluxo", 0.0),
                Map.entry("jogo-ruido-branco", 0.0),
                Map.entry("jogo-linha-de-mare", 0.0),
                Map.entry("jogo-jardim-de-vidro", 0.0),
                Map.entry("jogo-arquivo-07", 0.0),
                Map.entry("jogo-cidade-submersa", 14.90),
                Map.entry("jogo-orbita-baixa", 9.90),
                Map.entry("jogo-brasa-de-vidro", 12.90),
                Map.entry("jogo-mapa-de-areia", 0.0),
                Map.entry("jogo-piquenique-sideral", 9.90),
                Map.entry("jogo-coracao-de-cobre", 0.0),
                Map.entry("jogo-vale-das-engrenagens", 7.90),
                Map.entry("jogo-entre-trens", 0.0),
                Map.entry("jogo-sob-pressao", 14.90),
                Map.entry("jogo-cartas-de-marte", 0.0)
        );

        seeds.forEach((conteudo) -> {
            if (conteudo.getTipo() == TipoConteudo.JOGO) {
                conteudo.setPreco(precosJogos.getOrDefault(conteudo.getId(), 0.0));
            }

            if (conteudo.getTipo() == TipoConteudo.EVENTO || conteudo.getTipo() == TipoConteudo.GAME_JAM) {
                conteudo.setTamanhoEquipe(tamanhosEquipe.getOrDefault(conteudo.getId(), 4));
                conteudo.setModeloEquipe(modelosEquipe.getOrDefault(conteudo.getId(), "COMUM"));
            }
        });

        return seeds;
    }

    private Conteudo detalhes(Conteudo conteudo, String tema, LocalDate inscricoesAte,
                              List<Premio> premios, List<EtapaCronograma> cronograma,
                              List<String> regras, List<String> equipes, int equipesInscritas,
                              List<ComentarioConteudo> comentarios) {
        conteudo.setTema(tema);
        conteudo.setInscricoesAte(inscricoesAte);
        conteudo.setPremios(premios);
        conteudo.setCronograma(cronograma);
        conteudo.setRegras(regras);
        conteudo.setEquipes(equipes);
        conteudo.setEquipesInscritas(equipesInscritas);
        conteudo.setComentarios(comentarios);
        return conteudo;
    }

    private Premio premio(int posicao, String valor, String descricao) {
        return new Premio(posicao, valor, descricao);
    }

    private EtapaCronograma etapa(String titulo, String periodo) {
        return new EtapaCronograma(titulo, periodo);
    }

    private ComentarioConteudo comentario(String id, String autor, String handle, String texto,
                                         int curtidas, LocalDate criadoEm, ComentarioConteudo... respostas) {
        return new ComentarioConteudo(id, autor, handle, "/icon-perfil.png", texto, curtidas, criadoEm,
                List.of(respostas));
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
