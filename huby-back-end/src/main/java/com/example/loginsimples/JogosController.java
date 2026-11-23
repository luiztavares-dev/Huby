package com.example.loginsimples;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.net.URI;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@RestController
@RequestMapping("/api/jogos")
@CrossOrigin(origins = "*")
public class JogosController {

    private static final Set<String> PLATAFORMAS_PERMITIDAS = Set.of("pc", "mobile", "website");

    @Autowired
    private ConteudoRepository conteudoRepository;

    @Autowired
    private UsuarioRepository usuarioRepository;

    public record PublicarJogoDTO(
            String criadorId,
            String titulo,
            String descricao,
            String descricaoLonga,
            String desenvolvedor,
            String imagem,
            String linkUrl,
            List<String> tags,
            List<String> plataformas,
            Double preco
    ) {}

    @PostMapping
    public Conteudo publicar(@RequestBody PublicarJogoDTO dados) {
        if (dados == null || dados.titulo() == null || dados.titulo().trim().length() < 3) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Informe um nome com pelo menos 3 caracteres.");
        }

        if (dados.criadorId() == null || dados.criadorId().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Usuário não identificado.");
        }

        Usuario usuario = usuarioRepository.findById(dados.criadorId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuário não encontrado."));

        String titulo = dados.titulo().trim();
        String descricao = dados.descricao() == null ? "" : dados.descricao().trim();
        if (descricao.length() < 10) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A descrição deve ter pelo menos 10 caracteres.");
        }

        String linkUrl = dados.linkUrl() == null ? "" : dados.linkUrl().trim();
        validarLink(linkUrl);

        List<String> plataformas = normalizarPlataformas(dados.plataformas());
        double preco = dados.preco() == null ? 0.0 : dados.preco();
        if (!Double.isFinite(preco) || preco < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Informe um preço válido.");
        }

        String desenvolvedor = dados.desenvolvedor() == null ? "" : dados.desenvolvedor().trim();
        if (desenvolvedor.isBlank()) {
            desenvolvedor = usuario.getNomeExibicao() == null ? "" : usuario.getNomeExibicao().trim();
        }
        if (desenvolvedor.isBlank()) {
            desenvolvedor = usuario.getUsername() == null ? "" : usuario.getUsername().trim();
        }

        String imagem = dados.imagem() == null ? "" : dados.imagem().trim();
        String descricaoLonga = dados.descricaoLonga() == null ? "" : dados.descricaoLonga().trim();

        Conteudo jogo = new Conteudo();
        jogo.setTipo(TipoConteudo.JOGO);
        jogo.setTitulo(titulo);
        jogo.setDescricao(descricao);
        jogo.setDescricaoLonga(descricaoLonga.isBlank() ? descricao : descricaoLonga);
        jogo.setDesenvolvedor(desenvolvedor);
        jogo.setImagem(imagem.isBlank() ? "/imagem-polvojam.jpg" : imagem);
        jogo.setLinkUrl(linkUrl);
        jogo.setTags(normalizarTags(dados.tags()));
        jogo.setPlataformas(plataformas);
        jogo.setPreco(Math.round(preco * 100.0) / 100.0);
        jogo.setDataPublicacao(LocalDate.now());
        jogo.setCriadorId(usuario.getId());
        jogo.setDestaque(false);
        jogo.setRelevancia(0);
        jogo.setNota(0.0);
        jogo.setAvaliacoes(0);

        try {
            return conteudoRepository.save(jogo);
        } catch (DataIntegrityViolationException ex) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Não foi possível salvar o jogo.");
        }
    }

    private void validarLink(String linkUrl) {
        if (linkUrl.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Informe o link para jogar ou baixar.");
        }

        try {
            URI uri = URI.create(linkUrl);
            if (!Set.of("http", "https").contains(uri.getScheme() == null ? "" : uri.getScheme().toLowerCase(Locale.ROOT))
                    || uri.getHost() == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Informe um link HTTP ou HTTPS válido.");
            }
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Informe um link HTTP ou HTTPS válido.");
        }
    }

    private List<String> normalizarPlataformas(List<String> plataformas) {
        if (plataformas == null || plataformas.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Selecione pelo menos uma plataforma.");
        }

        LinkedHashSet<String> normalizadas = new LinkedHashSet<>();
        for (String plataforma : plataformas) {
            if (plataforma == null || plataforma.isBlank()) {
                continue;
            }
            String valor = plataforma.trim().toLowerCase(Locale.ROOT);
            if (!PLATAFORMAS_PERMITIDAS.contains(valor)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Plataforma não suportada.");
            }
            normalizadas.add(valor);
        }

        if (normalizadas.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Selecione pelo menos uma plataforma.");
        }
        return new ArrayList<>(normalizadas);
    }

    private List<String> normalizarTags(List<String> tags) {
        if (tags == null) {
            return new ArrayList<>();
        }

        LinkedHashSet<String> normalizadas = new LinkedHashSet<>();
        HashSet<String> vistas = new HashSet<>();
        for (String tag : tags) {
            if (tag != null && !tag.isBlank() && normalizadas.size() < 8) {
                String valor = tag.trim();
                if (vistas.add(valor.toLowerCase(Locale.ROOT))) {
                    normalizadas.add(valor);
                }
            }
        }
        return new ArrayList<>(normalizadas);
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    @ResponseStatus(HttpStatus.CONFLICT)
    public String tratarConflito() {
        return "Não foi possível salvar o jogo.";
    }
}
