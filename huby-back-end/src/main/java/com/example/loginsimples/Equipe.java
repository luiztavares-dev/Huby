package com.example.loginsimples;

import com.fasterxml.jackson.annotation.JsonFormat;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/** Equipe inscrita em um evento ou game jam. */
@Document(collection = "equipes")
public class Equipe {

    @Id
    private String id;

    private String eventoId = "";
    private String nome = "";
    private String liderId = "";
    private String experiencia = "";
    private String modelo = "COMUM";
    private String imagem = "";
    private String avatar = "";
    private Boolean abertaParaSolicitacoes = false;
    private List<IntegranteEquipe> integrantes = new ArrayList<>();
    private String entregaTitulo = "";
    private String entregaDescricao = "";
    private String entregaLink = "";
    private String entregaImagem = "";

    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
    private LocalDate entregueEm;
    private String jogoId = "";

    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
    private LocalDate criadoEm;

    public Equipe() {
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getEventoId() { return eventoId; }
    public void setEventoId(String eventoId) { this.eventoId = eventoId; }

    public String getNome() { return nome; }
    public void setNome(String nome) { this.nome = nome; }

    public String getLiderId() { return liderId; }
    public void setLiderId(String liderId) { this.liderId = liderId; }

    public String getExperiencia() { return experiencia; }
    public void setExperiencia(String experiencia) { this.experiencia = experiencia; }

    public String getModelo() { return modelo; }
    public void setModelo(String modelo) { this.modelo = modelo; }

    public String getImagem() { return imagem; }
    public void setImagem(String imagem) { this.imagem = imagem; }

    public String getAvatar() { return avatar; }
    public void setAvatar(String avatar) { this.avatar = avatar; }

    public Boolean getAbertaParaSolicitacoes() { return abertaParaSolicitacoes; }
    public void setAbertaParaSolicitacoes(Boolean abertaParaSolicitacoes) {
        this.abertaParaSolicitacoes = abertaParaSolicitacoes;
    }

    public List<IntegranteEquipe> getIntegrantes() { return integrantes; }
    public void setIntegrantes(List<IntegranteEquipe> integrantes) { this.integrantes = integrantes; }

    public String getEntregaTitulo() { return entregaTitulo; }
    public void setEntregaTitulo(String entregaTitulo) { this.entregaTitulo = entregaTitulo; }
    public String getEntregaDescricao() { return entregaDescricao; }
    public void setEntregaDescricao(String entregaDescricao) { this.entregaDescricao = entregaDescricao; }
    public String getEntregaLink() { return entregaLink; }
    public void setEntregaLink(String entregaLink) { this.entregaLink = entregaLink; }
    public String getEntregaImagem() { return entregaImagem; }
    public void setEntregaImagem(String entregaImagem) { this.entregaImagem = entregaImagem; }
    public LocalDate getEntregueEm() { return entregueEm; }
    public void setEntregueEm(LocalDate entregueEm) { this.entregueEm = entregueEm; }
    public String getJogoId() { return jogoId; }
    public void setJogoId(String jogoId) { this.jogoId = jogoId; }

    public LocalDate getCriadoEm() { return criadoEm; }
    public void setCriadoEm(LocalDate criadoEm) { this.criadoEm = criadoEm; }
}
