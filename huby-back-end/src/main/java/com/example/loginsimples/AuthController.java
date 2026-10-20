package com.example.loginsimples;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import org.mindrot.jbcrypt.BCrypt;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.ResponseEntity;
import java.util.Map;
import java.util.UUID;

@RestController
@CrossOrigin(origins = "*")
@RequestMapping("/api")
public class AuthController {

    @Autowired
    private UsuarioRepository repository;

    @PostMapping("/registrar")
    public String registrar(@RequestBody Usuario novoUsuario) {
        if (repository.findByLogin(novoUsuario.getLogin()) != null) {
            return "Erro: Esse usuário já existe!";
        }

        String senhaCriptografada = BCrypt.hashpw(novoUsuario.getSenha(), BCrypt.gensalt());
        novoUsuario.setSenha(senhaCriptografada);

        repository.save(novoUsuario);
        return "Usuário registrado com sucesso no banco!";
    }

    @PostMapping("/login")
    public String login(@RequestBody Usuario dadosLogin) {
        Usuario usuarioNoBanco = repository.findByLogin(dadosLogin.getLogin());
        
        if (usuarioNoBanco != null && BCrypt.checkpw(dadosLogin.getSenha(), usuarioNoBanco.getSenha())) {
            return "Sucesso: Login aprovado!";
        }
        
        return "Erro: Login ou senha incorretos.";
    }

    
    @PostMapping("/google")
    public String loginComGoogle(@RequestBody Map<String, String> payload) {
        String token = payload.get("token");
        
        if (token == null) {
            return "Erro: Token do Google não fornecido.";
        }

        try {
            
            RestTemplate restTemplate = new RestTemplate();
            String url = "https://www.googleapis.com/oauth2/v3/userinfo?access_token=" + token;
            ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);
            

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                String email = (String) response.getBody().get("email");

                Usuario usuarioNoBanco = repository.findByLogin(email);

                if (usuarioNoBanco != null) {
                    return "Sucesso: Login com Google aprovado para " + email + "!";
                } else {
               
                    Usuario novoUsuario = new Usuario();
                    novoUsuario.setLogin(email);
                    
               
                    String senhaAleatoria = UUID.randomUUID().toString();
                    novoUsuario.setSenha(BCrypt.hashpw(senhaAleatoria, BCrypt.gensalt()));
                    
                    repository.save(novoUsuario);
                    return "Sucesso: Conta criada automaticamente com o Google para " + email + "!";
                }
            }
        } catch (Exception e) {
            return "Erro: Token do Google inválido ou expirado.";
        }
        
        return "Erro: Falha na autenticação com o servidor do Google.";
    }
}