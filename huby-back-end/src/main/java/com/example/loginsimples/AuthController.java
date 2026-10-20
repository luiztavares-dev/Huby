package com.example.loginsimples;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import org.mindrot.jbcrypt.BCrypt;

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

        // Criptografia das senhas
        String senhaCriptografada = BCrypt.hashpw(novoUsuario.getSenha(), BCrypt.gensalt());
        novoUsuario.setSenha(senhaCriptografada);

        repository.save(novoUsuario);
        return "Usuário registrado com sucesso no banco!";
    }

    @PostMapping("/login")
    public String login(@RequestBody Usuario dadosLogin) {
        Usuario usuarioNoBanco = repository.findByLogin(dadosLogin.getLogin());
        
        // encaixe com o bcrypt para verificar a senha
        if (usuarioNoBanco != null && BCrypt.checkpw(dadosLogin.getSenha(), usuarioNoBanco.getSenha())) {
            return "Sucesso: Login aprovado!";
        }
        
        return "Erro: Login ou senha incorretos.";
    }
}