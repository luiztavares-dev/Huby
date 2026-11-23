package com.example.loginsimples;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.text.Normalizer;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/comunidades")
@CrossOrigin(origins = "*")
public class ComunidadesController {

    private static final String CLOUDINARY_PREFIXO = "https://res.cloudinary.com/";
    private static final int NOME_MIN = 3;
    private static final int NOME_MAX = 50;
    private static final int TEXTO_MAX = 800;
    private static final int MENSAGEM_MAX = 200;

    static final String DONO = "DONO";
    static final String ADMIN = "ADMIN";
    static final String MEMBRO = "MEMBRO";

    private final ConteudoRepository conteudoRepository;
    private final UsuarioRepository usuarioRepository;

    public ComunidadesController(ConteudoRepository conteudoRepository, UsuarioRepository usuarioRepository) {
        this.conteudoRepository = conteudoRepository;
        this.usuarioRepository = usuarioRepository;
    }

    public record UsuarioDTO(String usuarioId) {
    }

    public record SolicitacaoDTO(String usuarioId, String mensagem) {
    }

    public record CargoDTO(String usuarioId, String cargo) {
    }

    public record ConfigDTO(String usuarioId, String titulo, String imagem, Boolean abertaParaSolicitacoes) {
    }

    public record PublicarDTO(String usuarioId, String texto, String respondendoA) {
    }

    public record EditarDTO(String usuarioId, String texto) {
    }

    @GetMapping
    public List<Conteudo> listar() {
        return conteudoRepository.findByTipoOrderByRelevanciaDescNotaDesc(TipoConteudo.COMUNIDADE);
    }

    @GetMapping("/minhas/{usuarioId}")
    public List<Conteudo> minhas(@PathVariable String usuarioId) {
        return conteudoRepository.findComunidadesDoMembro(usuarioId);
    }

    @GetMapping("/{id}")
    public Conteudo comunidade(@PathVariable String id) {
        return exigirComunidade(id);
    }

    @PostMapping("/{id}/solicitacoes")
    @ResponseStatus(HttpStatus.CREATED)
    public Conteudo solicitar(@PathVariable String id, @RequestBody SolicitacaoDTO dto) {
        Conteudo comunidade = exigirComunidade(id);
        prepararListas(comunidade);

        if (!Boolean.TRUE.equals(comunidade.getAbertaParaSolicitacoes())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Esta comunidade não está aceitando pedidos de entrada.");
        }

        Usuario solicitante = exigirUsuario(dto == null ? null : dto.usuarioId());

        if (cargoDe(comunidade, solicitante.getId()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Você já faz parte desta comunidade.");
        }

        Optional<SolicitacaoComunidade> existente = comunidade.getSolicitacoes().stream()
                .filter(item -> item != null && solicitante.getId().equals(item.getUsuarioId()))
                .findFirst();
        if (existente.isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Você já enviou um pedido para esta comunidade.");
        }

        SolicitacaoComunidade solicitacao = new SolicitacaoComunidade(
                "solicitacao-" + UUID.randomUUID(),
                solicitante.getId(),
                solicitante.getUsername(),
                avatarDe(solicitante),
                limite(dto.mensagem(), MENSAGEM_MAX));
        solicitacao.setCriadoEm(LocalDate.now());

        comunidade.getSolicitacoes().add(solicitacao);
        return conteudoRepository.save(comunidade);
    }

    @DeleteMapping("/{id}/solicitacoes/{solicitacaoId}")
    public Conteudo cancelar(@PathVariable String id, @PathVariable String solicitacaoId,
                             @RequestBody UsuarioDTO dto) {
        Conteudo comunidade = exigirComunidade(id);
        prepararListas(comunidade);

        SolicitacaoComunidade solicitacao = exigirSolicitacao(comunidade, solicitacaoId);
        String requisitante = exigirUsuario(dto == null ? null : dto.usuarioId()).getId();

        boolean proprio = requisitante.equals(solicitacao.getUsuarioId());
        if (!proprio) {
            exigirGestor(comunidade, requisitante);
        }

        comunidade.getSolicitacoes().remove(solicitacao);
        return conteudoRepository.save(comunidade);
    }

    @PostMapping("/{id}/solicitacoes/{solicitacaoId}/aceitar")
    public Conteudo aceitar(@PathVariable String id, @PathVariable String solicitacaoId,
                            @RequestBody UsuarioDTO dto) {
        Conteudo comunidade = exigirComunidade(id);
        prepararListas(comunidade);

        String requisitante = exigirUsuario(dto == null ? null : dto.usuarioId()).getId();
        exigirGestor(comunidade, requisitante);

        SolicitacaoComunidade solicitacao = exigirSolicitacao(comunidade, solicitacaoId);

        if (cargoDe(comunidade, solicitacao.getUsuarioId()).isPresent()) {
            comunidade.getSolicitacoes().remove(solicitacao);
            return conteudoRepository.save(comunidade);
        }

        Usuario novo = usuarioRepository.findById(solicitacao.getUsuarioId()).orElse(null);
        String nomeUsuario = novo != null && novo.getUsername() != null
                ? novo.getUsername() : solicitacao.getNomeUsuario();
        String avatar = novo != null ? avatarDe(novo) : solicitacao.getAvatar();

        IntegranteComunidade integrante = new IntegranteComunidade(
                solicitacao.getUsuarioId(), nomeUsuario, avatar, MEMBRO);
        integrante.setEntrouEm(LocalDate.now());

        comunidade.getSolicitacoes().remove(solicitacao);
        comunidade.getMembros().add(integrante);
        contar(comunidade, 1);

        return conteudoRepository.save(comunidade);
    }

    @PostMapping("/{id}/solicitacoes/{solicitacaoId}/recusar")
    public Conteudo recusar(@PathVariable String id, @PathVariable String solicitacaoId,
                            @RequestBody UsuarioDTO dto) {
        Conteudo comunidade = exigirComunidade(id);
        prepararListas(comunidade);

        exigirGestor(comunidade, exigirUsuario(dto == null ? null : dto.usuarioId()).getId());

        comunidade.getSolicitacoes().remove(exigirSolicitacao(comunidade, solicitacaoId));
        return conteudoRepository.save(comunidade);
    }

    @PatchMapping("/{id}/membros/{usuarioId}")
    public Conteudo alterarCargo(@PathVariable String id, @PathVariable String usuarioId,
                                 @RequestBody CargoDTO dto) {
        Conteudo comunidade = exigirComunidade(id);
        prepararListas(comunidade);

        exigirDono(comunidade, exigirUsuario(dto == null ? null : dto.usuarioId()).getId());

        if (usuarioId.equals(dto.usuarioId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "O cargo do dono não pode ser alterado.");
        }

        IntegranteComunidade alvo = exigirOutroMembro(comunidade, usuarioId);
        if (DONO.equals(alvo.getCargo())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Esta pessoa é a dona da comunidade.");
        }

        String cargo = normalizar(dto.cargo());
        if (!ADMIN.equals(cargo) && !MEMBRO.equals(cargo)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Escolha um cargo válido: administrador ou membro.");
        }

        alvo.setCargo(cargo);
        return conteudoRepository.save(comunidade);
    }

    @DeleteMapping("/{id}/membros/{usuarioId}")
    public Conteudo banir(@PathVariable String id, @PathVariable String usuarioId,
                          @RequestBody UsuarioDTO dto) {
        Conteudo comunidade = exigirComunidade(id);
        prepararListas(comunidade);

        IntegranteComunidade gestor = exigirGestor(comunidade, exigirUsuario(dto == null ? null : dto.usuarioId()).getId());
        IntegranteComunidade alvo = exigirOutroMembro(comunidade, usuarioId);

        if (alvo.getUsuarioId().equals(gestor.getUsuarioId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Use a opção de sair da comunidade para remover a si mesmo.");
        }
        if (DONO.equals(alvo.getCargo())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "O dono da comunidade não pode ser banido.");
        }
        if (ADMIN.equals(alvo.getCargo()) && !DONO.equals(gestor.getCargo())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Só o dono da comunidade pode remover um administrador.");
        }

        comunidade.getMembros().remove(alvo);
        contar(comunidade, -1);

        return conteudoRepository.save(comunidade);
    }

    @PostMapping("/{id}/sair")
    public Conteudo sair(@PathVariable String id, @RequestBody UsuarioDTO dto) {
        Conteudo comunidade = exigirComunidade(id);
        prepararListas(comunidade);

        Usuario usuario = exigirUsuario(dto == null ? null : dto.usuarioId());
        IntegranteComunidade alvo = exigirMembro(comunidade, usuario.getId());
        String cargo = alvo.getCargo();

        comunidade.getMembros().remove(alvo);

        if (DONO.equals(cargo)) {
            sucessor(comunidade).ifPresent(ProximoDono::aplicar);
            if (comunidade.getMembros().isEmpty()) {
                comunidade.setDonoId("");
            }
        }

        contar(comunidade, -1);

        return conteudoRepository.save(comunidade);
    }

    @PatchMapping("/{id}")
    public Conteudo configurar(@PathVariable String id, @RequestBody ConfigDTO dto) {
        Conteudo comunidade = exigirComunidade(id);
        prepararListas(comunidade);

        exigirGestor(comunidade, exigirUsuario(dto == null ? null : dto.usuarioId()).getId());

        if (dto.titulo() != null && !dto.titulo().isBlank()) {
            String titulo = dto.titulo().trim();
            if (titulo.length() < NOME_MIN || titulo.length() > NOME_MAX) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "O nome da comunidade deve ter entre " + NOME_MIN + " e " + NOME_MAX + " caracteres.");
            }
            if (!titulo.equalsIgnoreCase(comunidade.getTitulo())
                    && nomeEmUso(id, titulo)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "Já existe uma comunidade com esse nome.");
            }
            comunidade.setTitulo(titulo);
        }

        if (dto.imagem() != null && !dto.imagem().isBlank()) {
            String imagem = dto.imagem().trim();
            boolean hospedada = imagem.startsWith(CLOUDINARY_PREFIXO) || imagem.startsWith("/");
            if (!hospedada || imagem.length() > 500) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "A imagem da comunidade precisa estar hospedada no Cloudinary.");
            }
            comunidade.setImagem(imagem);
        }

        if (dto.abertaParaSolicitacoes() != null) {
            comunidade.setAbertaParaSolicitacoes(dto.abertaParaSolicitacoes());
        }

        return conteudoRepository.save(comunidade);
    }

    @DeleteMapping("/{id}")
    public Conteudo excluir(@PathVariable String id, @RequestBody UsuarioDTO dto) {
        Conteudo comunidade = exigirComunidade(id);

        exigirDono(comunidade, exigirUsuario(dto == null ? null : dto.usuarioId()).getId());

        conteudoRepository.delete(comunidade);
        return comunidade;
    }

    @PostMapping("/{id}/publicacoes")
    @ResponseStatus(HttpStatus.CREATED)
    public Conteudo publicar(@PathVariable String id, @RequestBody PublicarDTO dto) {
        Conteudo comunidade = exigirComunidade(id);
        prepararListas(comunidade);

        Usuario autor = exigirUsuario(dto == null ? null : dto.usuarioId());
        if (cargoDe(comunidade, autor.getId()).isEmpty()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Só quem participa desta comunidade pode publicar.");
        }

        String texto = limite(dto == null ? null : dto.texto(), TEXTO_MAX);
        if (texto.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Escreva algo antes de publicar.");
        }

        ComentarioConteudo publicacao = new ComentarioConteudo(
                "publicacao-" + UUID.randomUUID(),
                nomeExibicao(autor),
                "@" + autor.getUsername(),
                avatarDe(autor),
                texto,
                0,
                LocalDate.now(),
                List.of());

        String respondendoA = dto.respondendoA();
        if (respondendoA != null && !respondendoA.isBlank()) {
            ComentarioConteudo pai = acharPublicacao(comunidade, respondendoA.trim())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                            "A publicação respondida não existe mais."));
            if (pai.getRespostas() == null) {
                pai.setRespostas(new ArrayList<>());
            }
            pai.getRespostas().add(publicacao);
        } else {
            if (comunidade.getComentarios() == null) {
                comunidade.setComentarios(new ArrayList<>());
            }
            comunidade.getComentarios().add(publicacao);
        }

        return conteudoRepository.save(comunidade);
    }

    @PatchMapping("/{id}/publicacoes/{publicacaoId}")
    public Conteudo editar(@PathVariable String id, @PathVariable String publicacaoId,
                           @RequestBody EditarDTO dto) {
        Conteudo comunidade = exigirComunidade(id);
        prepararListas(comunidade);

        ComentarioConteudo publicacao = exigirPublicacao(comunidade, publicacaoId);
        Usuario requisitante = exigirUsuario(dto == null ? null : dto.usuarioId());

        if (!ehAutor(comunidade, publicacao, requisitante)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Só quem escreveu a publicação pode editá-la.");
        }

        String texto = limite(dto.texto(), TEXTO_MAX);
        if (texto.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A publicação não pode ficar vazia.");
        }

        publicacao.setTexto(texto);
        return conteudoRepository.save(comunidade);
    }

    @DeleteMapping("/{id}/publicacoes/{publicacaoId}")
    public Conteudo apagar(@PathVariable String id, @PathVariable String publicacaoId,
                           @RequestBody UsuarioDTO dto) {
        Conteudo comunidade = exigirComunidade(id);
        prepararListas(comunidade);

        ComentarioConteudo publicacao = exigirPublicacao(comunidade, publicacaoId);
        Usuario requisitante = exigirUsuario(dto == null ? null : dto.usuarioId());

        if (!ehAutor(comunidade, publicacao, requisitante)) {
            exigirGestor(comunidade, requisitante.getId());
        }

        removerPublicacao(comunidade, publicacao);
        return conteudoRepository.save(comunidade);
    }

    private Conteudo exigirComunidade(String id) {
        Conteudo comunidade = conteudoRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Comunidade não encontrada."));

        if (comunidade.getTipo() != TipoConteudo.COMUNIDADE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Este conteúdo não é uma comunidade.");
        }

        return comunidade;
    }

    private Usuario exigirUsuario(String usuarioId) {
        String id = usuarioId == null ? "" : usuarioId.trim();
        if (id.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Informe o usuário que executa a ação.");
        }
        return usuarioRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuário não encontrado."));
    }

    private void prepararListas(Conteudo comunidade) {
        if (comunidade.getMembros() == null) {
            comunidade.setMembros(new ArrayList<>());
        }
        if (comunidade.getSolicitacoes() == null) {
            comunidade.setSolicitacoes(new ArrayList<>());
        }
    }

    private Optional<String> cargoDe(Conteudo comunidade, String usuarioId) {
        if (usuarioId == null || comunidade.getMembros() == null) {
            return Optional.empty();
        }
        return comunidade.getMembros().stream()
                .filter(item -> item != null && usuarioId.equals(item.getUsuarioId()))
                .map(IntegranteComunidade::getCargo)
                .findFirst();
    }

    private IntegranteComunidade exigirMembro(Conteudo comunidade, String usuarioId) {
        return comunidade.getMembros().stream()
                .filter(item -> item != null && usuarioId.equals(item.getUsuarioId()))
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN,
                        "Você não faz parte desta comunidade."));
    }

    private IntegranteComunidade exigirOutroMembro(Conteudo comunidade, String usuarioId) {
        return comunidade.getMembros().stream()
                .filter(item -> item != null && usuarioId.equals(item.getUsuarioId()))
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Esta pessoa não faz parte da comunidade."));
    }

    private IntegranteComunidade exigirGestor(Conteudo comunidade, String usuarioId) {
        IntegranteComunidade membro = exigirMembro(comunidade, usuarioId);
        if (!DONO.equals(membro.getCargo()) && !ADMIN.equals(membro.getCargo())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Só o dono e os administradores podem fazer isso.");
        }
        return membro;
    }

    private IntegranteComunidade exigirDono(Conteudo comunidade, String usuarioId) {
        IntegranteComunidade membro = exigirMembro(comunidade, usuarioId);
        if (!DONO.equals(membro.getCargo())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Só o dono da comunidade pode fazer isso.");
        }
        return membro;
    }

    private SolicitacaoComunidade exigirSolicitacao(Conteudo comunidade, String solicitacaoId) {
        return comunidade.getSolicitacoes().stream()
                .filter(item -> item != null && solicitacaoId.equals(item.getId()))
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Pedido não encontrado."));
    }

    private Optional<ComentarioConteudo> acharPublicacao(Conteudo comunidade, String id) {
        if (comunidade.getComentarios() == null) {
            return Optional.empty();
        }

        Optional<ComentarioConteudo> direta = comunidade.getComentarios().stream()
                .filter(item -> item != null && id.equals(item.getId()))
                .findFirst();
        if (direta.isPresent()) {
            return direta;
        }

        return comunidade.getComentarios().stream()
                .filter(item -> item != null && item.getRespostas() != null)
                .flatMap(item -> item.getRespostas().stream())
                .filter(item -> item != null && id.equals(item.getId()))
                .findFirst();
    }

    private ComentarioConteudo exigirPublicacao(Conteudo comunidade, String publicacaoId) {
        return acharPublicacao(comunidade, publicacaoId == null ? "" : publicacaoId.trim())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Esta publicação não existe mais."));
    }

    /**
     * A publicação guarda apenas o handle do autor. O confronto é feito com o nome de usuário atual
     * e com o snapshot gravado na lista de membros, para sobreviver a uma mudança de nome.
     */
    private boolean ehAutor(Conteudo comunidade, ComentarioConteudo publicacao, Usuario requisitante) {
        String handle = semArroba(publicacao.getHandle());
        if (handle.isEmpty()) {
            return false;
        }

        if (requisitante.getUsername() != null && handle.equalsIgnoreCase(semArroba(requisitante.getUsername()))) {
            return true;
        }

        if (comunidade.getMembros() == null) {
            return false;
        }

        return comunidade.getMembros().stream()
                .anyMatch(item -> item != null
                        && requisitante.getId().equals(item.getUsuarioId())
                        && item.getNomeUsuario() != null
                        && handle.equalsIgnoreCase(semArroba(item.getNomeUsuario())));
    }

    private String semArroba(String valor) {
        return valor == null ? "" : valor.trim().replaceFirst("^@+", "");
    }

    private void removerPublicacao(Conteudo comunidade, ComentarioConteudo publicacao) {
        if (comunidade.getComentarios() == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Esta publicação não existe mais.");
        }

        if (comunidade.getComentarios().remove(publicacao)) {
            return;
        }

        for (ComentarioConteudo pai : comunidade.getComentarios()) {
            if (pai != null && pai.getRespostas() != null && pai.getRespostas().remove(publicacao)) {
                return;
            }
        }

        throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Esta publicação não existe mais.");
    }

    /** Quando o dono sai, o primeiro administrador restante assume; sem administrador, o primeiro membro. */
    private Optional<ProximoDono> sucessor(Conteudo comunidade) {
        List<IntegranteComunidade> membros = comunidade.getMembros();
        IntegranteComunidade novo = membros.stream()
                .filter(item -> item != null && ADMIN.equals(item.getCargo()))
                .findFirst()
                .orElseGet(() -> membros.isEmpty() ? null : membros.get(0));

        if (novo == null) {
            return Optional.empty();
        }
        return Optional.of(new ProximoDono(comunidade, novo));
    }

    private record ProximoDono(Conteudo comunidade, IntegranteComunidade novo) {
        void aplicar() {
            novo.setCargo(DONO);
            comunidade.setDonoId(novo.getUsuarioId());
        }
    }

    private boolean nomeEmUso(String idAtual, String titulo) {
        return conteudoRepository.findByTipoOrderByRelevanciaDescNotaDesc(TipoConteudo.COMUNIDADE).stream()
                .anyMatch(item -> !item.getId().equals(idAtual)
                        && titulo.equalsIgnoreCase(item.getTitulo()));
    }

    /** Ajusta o total exibido de participantes sem sobrescrever o histórico da comunidade. */
    private void contar(Conteudo comunidade, int delta) {
        int total = comunidade.getParticipantes() == null ? 0 : comunidade.getParticipantes();
        comunidade.setParticipantes(Math.max(0, total + delta));
    }

    private String avatarDe(Usuario usuario) {
        String avatar = usuario.getAvatarUrl() == null ? "" : usuario.getAvatarUrl().trim();
        return avatar.isEmpty() ? "/icon-perfil.png" : avatar;
    }

    private String nomeExibicao(Usuario usuario) {
        if (usuario.getNomeExibicao() != null && !usuario.getNomeExibicao().isBlank()) {
            return usuario.getNomeExibicao();
        }
        if (usuario.getUsername() != null && !usuario.getUsername().isBlank()) {
            return usuario.getUsername();
        }
        return usuario.getLogin() == null ? "Alguém" : usuario.getLogin();
    }

    private String limite(String valor, int maximo) {
        String texto = valor == null ? "" : valor.trim();
        return texto.length() > maximo ? texto.substring(0, maximo) : texto;
    }

    private String normalizar(String valor) {
        if (valor == null) return "";
        return Normalizer.normalize(valor.trim(), Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toUpperCase(Locale.ROOT);
    }
}
