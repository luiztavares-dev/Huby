package com.example.loginsimples;

public class MidiaConteudo {

    private String tipo;
    private String url;

    public MidiaConteudo() {
    }

    public MidiaConteudo(String tipo, String url) {
        this.tipo = tipo;
        this.url = url;
    }

    public String getTipo() { return tipo; }
    public void setTipo(String tipo) { this.tipo = tipo; }

    public String getUrl() { return url; }
    public void setUrl(String url) { this.url = url; }
}
