package com.example.loginsimples;

import com.fasterxml.jackson.annotation.JsonFormat;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDate;
import java.time.LocalDateTime;
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
    private Double preco = 0.0;

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
    private String linkUrl = "";
    private String criadorId = "";
    private String bannerUrl = "";
    private String tipoPremiacao = "SEM_PREMIACAO";
    private List<String> contatos = new ArrayList<>();

    /** Detalhes exibidos na página de eventos (EVENTO e GAME_JAM). */
    private String tema = "";

    /** Modelo de inscrição definido pela organização: COMUM, SURPRESA ou INDIVIDUAL. */
    private String modeloEquipe = "COMUM";
    private Boolean sorteioRealizado = false;

    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
    private LocalDate inscricoesAte;

    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm")
    private LocalDateTime inscricoesInicio;
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm")
    private LocalDateTime inscricoesFim;
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm")
    private LocalDateTime desenvolvimentoInicio;
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm")
    private LocalDateTime desenvolvimentoFim;
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm")
    private LocalDateTime analiseInicio;
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm")
    private LocalDateTime analiseFim;
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm")
    private LocalDateTime dataPremiacao;

    private List<Premio> premios = new ArrayList<>();
    private List<EtapaCronograma> cronograma = new ArrayList<>();
    private List<String> regras = new ArrayList<>();
    private List<ComentarioConteudo> comentarios = new ArrayList<>();
    private List<String> equipes = new ArrayList<>();
    private Integer equipesInscritas = 0;

    /** Quantidade de integrantes exigida na inscrição de uma equipe. */
    private Integer tamanhoEquipe;

    /** Usuário com poder total sobre a comunidade (apenas para tipo COMUNIDADE). */
    private String donoId = "";

    private List<IntegranteComunidade> membros = new ArrayList<>();
    private List<SolicitacaoComunidade> solicitacoes = new ArrayList<>();

    /** Quando falso, a comunidade não aceita pedidos de entrada. */
    private Boolean abertaParaSolicitacoes = true;

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

    public Double getPreco() { return preco; }
    public void setPreco(Double preco) { this.preco = preco; }

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
    public String getLinkUrl() { return linkUrl; }
    public void setLinkUrl(String linkUrl) { this.linkUrl = linkUrl; }
    public String getCriadorId() { return criadorId; }
    public void setCriadorId(String criadorId) { this.criadorId = criadorId; }
    public String getBannerUrl() { return bannerUrl; }
    public void setBannerUrl(String bannerUrl) { this.bannerUrl = bannerUrl; }
    public String getTipoPremiacao() { return tipoPremiacao; }
    public void setTipoPremiacao(String tipoPremiacao) { this.tipoPremiacao = tipoPremiacao; }
    public List<String> getContatos() { return contatos; }
    public void setContatos(List<String> contatos) { this.contatos = contatos; }

    public String getTema() { return tema; }
    public void setTema(String tema) { this.tema = tema; }

    public String getModeloEquipe() { return modeloEquipe; }
    public void setModeloEquipe(String modeloEquipe) { this.modeloEquipe = modeloEquipe; }

    public Boolean getSorteioRealizado() { return sorteioRealizado; }
    public void setSorteioRealizado(Boolean sorteioRealizado) { this.sorteioRealizado = sorteioRealizado; }

    public LocalDate getInscricoesAte() { return inscricoesAte; }
    public void setInscricoesAte(LocalDate inscricoesAte) { this.inscricoesAte = inscricoesAte; }

    public LocalDateTime getInscricoesInicio() { return inscricoesInicio; }
    public void setInscricoesInicio(LocalDateTime inscricoesInicio) { this.inscricoesInicio = inscricoesInicio; }

    public LocalDateTime getInscricoesFim() { return inscricoesFim; }
    public void setInscricoesFim(LocalDateTime inscricoesFim) { this.inscricoesFim = inscricoesFim; }

    public LocalDateTime getDesenvolvimentoInicio() { return desenvolvimentoInicio; }
    public void setDesenvolvimentoInicio(LocalDateTime desenvolvimentoInicio) { this.desenvolvimentoInicio = desenvolvimentoInicio; }

    public LocalDateTime getDesenvolvimentoFim() { return desenvolvimentoFim; }
    public void setDesenvolvimentoFim(LocalDateTime desenvolvimentoFim) { this.desenvolvimentoFim = desenvolvimentoFim; }

    public LocalDateTime getAnaliseInicio() { return analiseInicio; }
    public void setAnaliseInicio(LocalDateTime analiseInicio) { this.analiseInicio = analiseInicio; }

    public LocalDateTime getAnaliseFim() { return analiseFim; }
    public void setAnaliseFim(LocalDateTime analiseFim) { this.analiseFim = analiseFim; }

    public LocalDateTime getDataPremiacao() { return dataPremiacao; }
    public void setDataPremiacao(LocalDateTime dataPremiacao) { this.dataPremiacao = dataPremiacao; }

    public List<Premio> getPremios() { return premios; }
    public void setPremios(List<Premio> premios) { this.premios = premios; }

    public List<EtapaCronograma> getCronograma() { return cronograma; }
    public void setCronograma(List<EtapaCronograma> cronograma) { this.cronograma = cronograma; }

    public List<String> getRegras() { return regras; }
    public void setRegras(List<String> regras) { this.regras = regras; }

    public List<ComentarioConteudo> getComentarios() { return comentarios; }
    public void setComentarios(List<ComentarioConteudo> comentarios) { this.comentarios = comentarios; }

    public List<String> getEquipes() { return equipes; }
    public void setEquipes(List<String> equipes) { this.equipes = equipes; }

    public Integer getEquipesInscritas() { return equipesInscritas; }
    public void setEquipesInscritas(Integer equipesInscritas) { this.equipesInscritas = equipesInscritas; }

    public Integer getTamanhoEquipe() { return tamanhoEquipe; }
    public void setTamanhoEquipe(Integer tamanhoEquipe) { this.tamanhoEquipe = tamanhoEquipe; }

    public String getDonoId() { return donoId; }
    public void setDonoId(String donoId) { this.donoId = donoId; }

    public List<IntegranteComunidade> getMembros() { return membros; }
    public void setMembros(List<IntegranteComunidade> membros) { this.membros = membros; }

    public List<SolicitacaoComunidade> getSolicitacoes() { return solicitacoes; }
    public void setSolicitacoes(List<SolicitacaoComunidade> solicitacoes) { this.solicitacoes = solicitacoes; }

    public Boolean getAbertaParaSolicitacoes() { return abertaParaSolicitacoes; }
    public void setAbertaParaSolicitacoes(Boolean abertaParaSolicitacoes) {
        this.abertaParaSolicitacoes = abertaParaSolicitacoes;
    }
}
