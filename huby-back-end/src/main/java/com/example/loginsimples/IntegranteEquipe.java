package com.example.loginsimples;

/** Integrante embutido no documento de uma equipe inscrita. */
public class IntegranteEquipe {

    private String nomeUsuario = "";
    private String funcao = "";
    private String avatar = "";

    /** "CONFIRMADO", "PENDENTE" (convite enviado) ou "RECUSADO". */
    private String status = "CONFIRMADO";

    public IntegranteEquipe() {
    }

    public IntegranteEquipe(String nomeUsuario, String funcao) {
        this.nomeUsuario = nomeUsuario;
        this.funcao = funcao;
    }

    public IntegranteEquipe(String nomeUsuario, String funcao, String avatar) {
        this.nomeUsuario = nomeUsuario;
        this.funcao = funcao;
        this.avatar = avatar;
    }

    public String getNomeUsuario() { return nomeUsuario; }
    public void setNomeUsuario(String nomeUsuario) { this.nomeUsuario = nomeUsuario; }

    public String getFuncao() { return funcao; }
    public void setFuncao(String funcao) { this.funcao = funcao; }

    public String getAvatar() { return avatar; }
    public void setAvatar(String avatar) { this.avatar = avatar; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
