package com.example.loginsimples;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

/**
 * Função que um integrante pode assumir dentro de uma equipe inscrita.
 * A lista é mantida no banco (coleção "funcoes") para alimentar os selects da tela de inscrição.
 */
@Document(collection = "funcoes")
public class FuncaoEquipe {

    @Id
    private String id;

    private String nome = "";
    private Integer ordem = 0;

    public FuncaoEquipe() {
    }

    public FuncaoEquipe(String id, String nome, int ordem) {
        this.id = id;
        this.nome = nome;
        this.ordem = ordem;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getNome() { return nome; }
    public void setNome(String nome) { this.nome = nome; }

    public Integer getOrdem() { return ordem; }
    public void setOrdem(Integer ordem) { this.ordem = ordem; }
}
