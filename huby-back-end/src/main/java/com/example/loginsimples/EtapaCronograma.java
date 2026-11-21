package com.example.loginsimples;

/** Etapa exibida no cronograma de um evento ou game jam. */
public class EtapaCronograma {

    private String titulo = "";
    private String periodo = "";

    public EtapaCronograma() {
    }

    public EtapaCronograma(String titulo, String periodo) {
        this.titulo = titulo;
        this.periodo = periodo;
    }

    public String getTitulo() { return titulo; }
    public void setTitulo(String titulo) { this.titulo = titulo; }

    public String getPeriodo() { return periodo; }
    public void setPeriodo(String periodo) { this.periodo = periodo; }
}
