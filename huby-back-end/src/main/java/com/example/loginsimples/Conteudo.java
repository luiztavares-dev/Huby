package com.example.loginsimples;

import com.fasterxml.jackson.annotation.JsonFormat;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Document(collection = "conteudos")
public class Conteudo {

    @Id
    private String id;

    private TipoConteudo tipo;

    private String titulo = "";
    private String descricao = "";
    private String descricaoLonga = "";
    private String desenvolvedor = "";
    private String imagem = "";

    private List<String> tags = new ArrayList<>();
    private List<String> plataformas = new ArrayList<>();

    private Double nota = 0.0;
    private Integer avaliacoes = 0;

    private Boolean destaque = false;
    private Integer relevancia = 0;

    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
    private LocalDate dataPublicacao;

    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
    private LocalDate dataInicio;

    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
    private LocalDate dataFim;

    private Integer participantes;

    private String local = "";

    /** Id da game jam à qual o jogo pertence (apenas para tipo JOGO). */
    private String gameJamId;

    public Conteudo() {
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public TipoConteudo getTipo() { return tipo; }
    public void setTipo(TipoConteudo tipo) { this.tipo = tipo; }

    public String getTitulo() { return titulo; }
    public void setTitulo(String titulo) { this.titulo = titulo; }

    public String getDescricao() { return descricao; }
    public void setDescricao(String descricao) { this.descricao = descricao; }

    public String getDescricaoLonga() { return descricaoLonga; }
    public void setDescricaoLonga(String descricaoLonga) { this.descricaoLonga = descricaoLonga; }

    public String getDesenvolvedor() { return desenvolvedor; }
    public void setDesenvolvedor(String desenvolvedor) { this.desenvolvedor = desenvolvedor; }

    public String getImagem() { return imagem; }
    public void setImagem(String imagem) { this.imagem = imagem; }

    public List<String> getTags() { return tags; }
    public void setTags(List<String> tags) { this.tags = tags; }

    public List<String> getPlataformas() { return plataformas; }
    public void setPlataformas(List<String> plataformas) { this.plataformas = plataformas; }

    public Double getNota() { return nota; }
    public void setNota(Double nota) { this.nota = nota; }

    public Integer getAvaliacoes() { return avaliacoes; }
    public void setAvaliacoes(Integer avaliacoes) { this.avaliacoes = avaliacoes; }

    public Boolean getDestaque() { return destaque; }
    public void setDestaque(Boolean destaque) { this.destaque = destaque; }

    public Integer getRelevancia() { return relevancia; }
    public void setRelevancia(Integer relevancia) { this.relevancia = relevancia; }

    public LocalDate getDataPublicacao() { return dataPublicacao; }
    public void setDataPublicacao(LocalDate dataPublicacao) { this.dataPublicacao = dataPublicacao; }

    public LocalDate getDataInicio() { return dataInicio; }
    public void setDataInicio(LocalDate dataInicio) { this.dataInicio = dataInicio; }

    public LocalDate getDataFim() { return dataFim; }
    public void setDataFim(LocalDate dataFim) { this.dataFim = dataFim; }

    public Integer getParticipantes() { return participantes; }
    public void setParticipantes(Integer participantes) { this.participantes = participantes; }

    public String getLocal() { return local; }
    public void setLocal(String local) { this.local = local; }

    public String getGameJamId() { return gameJamId; }
    public void setGameJamId(String gameJamId) { this.gameJamId = gameJamId; }
}
