package com.example.loginsimples;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "usuarios")
public class Usuario {
    
    @Id
    private String id; 
    private String login;
    private String senha;

    public Usuario() {
    }

    public Usuario(String login, String senha) {
        this.login = login;
        this.senha = senha;
    }

    // Getters
    public String getId() { return id; }
    public String getLogin() { return login; }
    public String getSenha() { return senha; }

    // Setters (Esses caras permitem que o AuthController modifique a senha!)
    public void setId(String id) { this.id = id; }
    public void setLogin(String login) { this.login = login; }
    public void setSenha(String senha) { this.senha = senha; }
}