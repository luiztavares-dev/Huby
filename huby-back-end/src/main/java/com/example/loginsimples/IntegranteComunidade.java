package com.example.loginsimples;

import com.fasterxml.jackson.annotation.JsonFormat;

import java.time.LocalDate;

/** Membro embutido no documento de uma comunidade. */
public class IntegranteComunidade {

    private String usuarioId = "";
    private String nomeUsuario = "";
    private String avatar = "";

    /** "DONO", "ADMIN" ou "MEMBRO". */
    private String cargo = "MEMBRO";

    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
    private LocalDate entrouEm;

    public IntegranteComunidade() {
    }

    public IntegranteComunidade(String usuarioId, String nomeUsuario, String avatar, String cargo) {
        this.usuarioId = usuarioId;
        this.nomeUsuario = nomeUsuario;
        this.avatar = avatar;
        this.cargo = cargo;
    }

    public String getUsuarioId() { return usuarioId; }
    public void setUsuarioId(String usuarioId) { this.usuarioId = usuarioId; }

    public String getNomeUsuario() { return nomeUsuario; }
    public void setNomeUsuario(String nomeUsuario) { this.nomeUsuario = nomeUsuario; }

    public String getAvatar() { return avatar; }
    public void setAvatar(String avatar) { this.avatar = avatar; }

    public String getCargo() { return cargo; }
    public void setCargo(String cargo) { this.cargo = cargo; }

    public LocalDate getEntrouEm() { return entrouEm; }
    public void setEntrouEm(LocalDate entrouEm) { this.entrouEm = entrouEm; }
}
