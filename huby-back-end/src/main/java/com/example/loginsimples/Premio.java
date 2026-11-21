package com.example.loginsimples;

/** Colocação premiada de um evento ou game jam. */
public class Premio {

    private Integer posicao = 0;
    private String valor = "";
    private String descricao = "";

    public Premio() {
    }

    public Premio(Integer posicao, String valor, String descricao) {
        this.posicao = posicao;
        this.valor = valor;
        this.descricao = descricao;
    }

    public Integer getPosicao() { return posicao; }
    public void setPosicao(Integer posicao) { this.posicao = posicao; }

    public String getValor() { return valor; }
    public void setValor(String valor) { this.valor = valor; }

    public String getDescricao() { return descricao; }
    public void setDescricao(String descricao) { this.descricao = descricao; }
}
