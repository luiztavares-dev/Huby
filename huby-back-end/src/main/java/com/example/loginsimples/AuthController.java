package com.example.loginsimples;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import org.mindrot.jbcrypt.BCrypt;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import java.util.Map;
import java.util.UUID;
import java.util.Optional;

@RestController
@CrossOrigin(origins = "*")
@RequestMapping("/api")
public class AuthController {

    @Autowired
    private UsuarioRepository repository;


    @PostMapping("/registrar")
    public ResponseEntity<?> registrar(@RequestBody Usuario novoUsuario) {
        if (repository.findByLogin(novoUsuario.getLogin()) != null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Erro: Esse e-mail já está em uso!");
        }

        String senhaCriptografada = BCrypt.hashpw(novoUsuario.getSenha(), BCrypt.gensalt());
        novoUsuario.setSenha(senhaCriptografada);

        Usuario salvo = repository.save(novoUsuario);
        return ResponseEntity.ok(salvo);
    }

   
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Usuario dadosLogin) {
        Usuario usuarioNoBanco = repository.findByLogin(dadosLogin.getLogin());
        
        if (usuarioNoBanco != null && BCrypt.checkpw(dadosLogin.getSenha(), usuarioNoBanco.getSenha())) {
            return ResponseEntity.ok(usuarioNoBanco);
        }
        
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Erro: Login ou senha incorretos.");
    }

   
    @PostMapping("/google")
    public ResponseEntity<?> loginComGoogle(@RequestBody Map<String, String> payload) {
        String token = payload.get("token");
        if (token == null) return ResponseEntity.badRequest().body("Erro: Token não fornecido.");

        try {
            RestTemplate restTemplate = new RestTemplate();
            String url = "https://www.googleapis.com/oauth2/v3/userinfo?access_token=" + token;
            ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);
            
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                Map<String, Object> body = response.getBody();
                String email = (String) body.get("email");
                String nome = (String) body.get("name");

                Usuario usuarioNoBanco = repository.findByLogin(email);

                if (usuarioNoBanco == null) {
                    usuarioNoBanco = new Usuario();
                    usuarioNoBanco.setLogin(email);
                    usuarioNoBanco.setNomeExibicao(nome != null ? nome : email.split("@")[0]);
                    usuarioNoBanco.setUsername(email.split("@")[0].toLowerCase().replaceAll("[^a-z0-9]", ""));
                    
                    String senhaAleatoria = UUID.randomUUID().toString();
                    usuarioNoBanco.setSenha(BCrypt.hashpw(senhaAleatoria, BCrypt.gensalt()));
                    usuarioNoBanco = repository.save(usuarioNoBanco);
                }
                return ResponseEntity.ok(usuarioNoBanco);
            }
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Erro: Token do Google inválido.");
        }
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Erro na autenticação com Google.");
    }


    @GetMapping("/perfil/{id}")
    public ResponseEntity<?> buscarPerfil(@PathVariable String id) {
        Optional<Usuario> opt = repository.findById(id);
        if (opt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Erro: Usuário não encontrado.");
        }
        return ResponseEntity.ok(opt.get());
    }


    @PutMapping("/perfil/{id}")
    public ResponseEntity<?> atualizarPerfil(@PathVariable String id, @RequestBody Usuario dadosAtualizados) {
        Optional<Usuario> opt = repository.findById(id);
        if (opt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Erro: Usuário não encontrado.");
        }

        Usuario u = opt.get();
        if (dadosAtualizados.getNomeExibicao() != null) u.setNomeExibicao(dadosAtualizados.getNomeExibicao());
        if (dadosAtualizados.getUsername() != null) u.setUsername(dadosAtualizados.getUsername());
        if (dadosAtualizados.getBio() != null) u.setBio(dadosAtualizados.getBio());
        if (dadosAtualizados.getAvatarUrl() != null) u.setAvatarUrl(dadosAtualizados.getAvatarUrl());
        if (dadosAtualizados.getBannerUrl() != null) u.setBannerUrl(dadosAtualizados.getBannerUrl());
        
        if (dadosAtualizados.getInstagram() != null) u.setInstagram(dadosAtualizados.getInstagram());
        if (dadosAtualizados.getDiscord() != null) u.setDiscord(dadosAtualizados.getDiscord());
        if (dadosAtualizados.getTwitter() != null) u.setTwitter(dadosAtualizados.getTwitter());
        if (dadosAtualizados.getTiktok() != null) u.setTiktok(dadosAtualizados.getTiktok());
        if (dadosAtualizados.getSteam() != null) u.setSteam(dadosAtualizados.getSteam());
        if (dadosAtualizados.getItchIo() != null) u.setItchIo(dadosAtualizados.getItchIo());

        repository.save(u);
        return ResponseEntity.ok(u);
    }
}