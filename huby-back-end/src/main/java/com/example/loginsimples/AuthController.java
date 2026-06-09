package com.example.loginsimples;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

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
        repository.save(novoUsuario);
        return "Usuário registrado com sucesso no banco!";
    }

    @PostMapping("/login")
    public String login(@RequestBody Usuario dadosLogin) {
        Usuario usuarioNoBanco = repository.findByLogin(dadosLogin.getLogin());
        if (usuarioNoBanco != null && usuarioNoBanco.getSenha().equals(dadosLogin.getSenha())) {
            return "Sucesso: Login aprovado!";
        }
        
        return "Erro: Login ou senha incorretos.";
    }
}
