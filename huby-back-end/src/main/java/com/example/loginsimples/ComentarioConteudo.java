package com.example.loginsimples;

import com.fasterxml.jackson.annotation.JsonFormat;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/** Comentário exibido na página de detalhes de um evento ou game jam. */
public class ComentarioConteudo {

    private String id = "";
    private String autor = "";
    private String handle = "";
    private String avatar = "";
    private String texto = "";
    private Integer curtidas = 0;

    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
    private LocalDate criadoEm;

    private List<ComentarioConteudo> respostas = new ArrayList<>();

    public ComentarioConteudo() {
    }

    public ComentarioConteudo(String id, String autor, String handle, String avatar, String texto,
                              Integer curtidas, LocalDate criadoEm, List<ComentarioConteudo> respostas) {
        this.id = id;
        this.autor = autor;
        this.handle = handle;
        this.avatar = avatar;
        this.texto = texto;
        this.curtidas = curtidas;
        this.criadoEm = criadoEm;
        this.respostas = respostas == null ? new ArrayList<>() : new ArrayList<>(respostas);
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getAutor() { return autor; }
    public void setAutor(String autor) { this.autor = autor; }

    public String getHandle() { return handle; }
    public void setHandle(String handle) { this.handle = handle; }

    public String getAvatar() { return avatar; }
    public void setAvatar(String avatar) { this.avatar = avatar; }

    public String getTexto() { return texto; }
    public void setTexto(String texto) { this.texto = texto; }

    public Integer getCurtidas() { return curtidas; }
    public void setCurtidas(Integer curtidas) { this.curtidas = curtidas; }

    public LocalDate getCriadoEm() { return criadoEm; }
    public void setCriadoEm(LocalDate criadoEm) { this.criadoEm = criadoEm; }

    public List<ComentarioConteudo> getRespostas() { return respostas; }
    public void setRespostas(List<ComentarioConteudo> respostas) { this.respostas = respostas; }
}
