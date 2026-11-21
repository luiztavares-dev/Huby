package com.example.loginsimples;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDateTime;

@Document(collection = "mensagens")
public class Mensagem {
    
    @Id
    private String id;
    private String remetenteId;
    private String destinatarioId;
    private String texto;
    private LocalDateTime dataHora;

    /** "TEXTO" para mensagens normais ou "CONVITE_EQUIPE" para pedidos de entrada em equipe. */
    private String tipo = "TEXTO";

    private String equipeId = "";
    private String eventoId = "";
    private String eventoTitulo = "";
    private String equipeNome = "";
    private String funcao = "";

    /** Status do convite: "PENDENTE", "ACEITO" ou "RECUSADO". */
    private String conviteStatus = "";

    public Mensagem() {}

    // Getters e Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getRemetenteId() { return remetenteId; }
    public void setRemetenteId(String remetenteId) { this.remetenteId = remetenteId; }

    public String getDestinatarioId() { return destinatarioId; }
    public void setDestinatarioId(String destinatarioId) { this.destinatarioId = destinatarioId; }

    public String getTexto() { return texto; }
    public void setTexto(String texto) { this.texto = texto; }

    public LocalDateTime getDataHora() { return dataHora; }
    public void setDataHora(LocalDateTime dataHora) { this.dataHora = dataHora; }

    public String getTipo() { return tipo; }
    public void setTipo(String tipo) { this.tipo = tipo; }

    public String getEquipeId() { return equipeId; }
    public void setEquipeId(String equipeId) { this.equipeId = equipeId; }

    public String getEventoId() { return eventoId; }
    public void setEventoId(String eventoId) { this.eventoId = eventoId; }

    public String getEventoTitulo() { return eventoTitulo; }
    public void setEventoTitulo(String eventoTitulo) { this.eventoTitulo = eventoTitulo; }

    public String getEquipeNome() { return equipeNome; }
    public void setEquipeNome(String equipeNome) { this.equipeNome = equipeNome; }

    public String getFuncao() { return funcao; }
    public void setFuncao(String funcao) { this.funcao = funcao; }

    public String getConviteStatus() { return conviteStatus; }
    public void setConviteStatus(String conviteStatus) { this.conviteStatus = conviteStatus; }
}