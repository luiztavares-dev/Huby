package com.example.loginsimples;

import com.fasterxml.jackson.annotation.JsonFormat;

import java.time.LocalDate;

/** Pedido de entrada pendente em uma comunidade. Some quando aceito ou recusado. */
public class SolicitacaoComunidade {

    private String id = "";
    private String usuarioId = "";
    private String nomeUsuario = "";
    private String avatar = "";
    private String mensagem = "";

    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
    private LocalDate criadoEm;

    public SolicitacaoComunidade() {
    }

    public SolicitacaoComunidade(String id, String usuarioId, String nomeUsuario, String avatar, String mensagem) {
        this.id = id;
        this.usuarioId = usuarioId;
        this.nomeUsuario = nomeUsuario;
        this.avatar = avatar;
        this.mensagem = mensagem;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getUsuarioId() { return usuarioId; }
    public void setUsuarioId(String usuarioId) { this.usuarioId = usuarioId; }

    public String getNomeUsuario() { return nomeUsuario; }
    public void setNomeUsuario(String nomeUsuario) { this.nomeUsuario = nomeUsuario; }

    public String getAvatar() { return avatar; }
    public void setAvatar(String avatar) { this.avatar = avatar; }

    public String getMensagem() { return mensagem; }
    public void setMensagem(String mensagem) { this.mensagem = mensagem; }

    public LocalDate getCriadoEm() { return criadoEm; }
    public void setCriadoEm(LocalDate criadoEm) { this.criadoEm = criadoEm; }
}
