package com.example.loginsimples;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.ArrayList;
import java.util.List;

@Document(collection = "carrinhos")
public class Carrinho {

    @Id
    private String id;
    private String usuarioId;
    private List<String> jogosIds = new ArrayList<>();

    public Carrinho() {}

    public Carrinho(String usuarioId) {
        this.usuarioId = usuarioId;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getUsuarioId() { return usuarioId; }
    public void setUsuarioId(String usuarioId) { this.usuarioId = usuarioId; }

    public List<String> getJogosIds() { return jogosIds; }
    public void setJogosIds(List<String> jogosIds) { this.jogosIds = jogosIds; }
}