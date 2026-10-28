package com.example.loginsimples;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;
import java.util.ArrayList;

@Document(collection = "usuarios")
public class Usuario {
    
    @Id
    private String id; 
    private String login;
    
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    private String senha;

    private String nomeExibicao = "";
    private String username = "";

    private String bio = "";
    private String avatarUrl = "";
    private String bannerUrl = "";

    private String instagram = "";
    private String discord = "";
    private String twitter = "";
    private String tiktok = "";
    private String steam = "";
    private String itchIo = "";

  
    private List<String> seguindo = new ArrayList<>();
    private List<String> seguidores = new ArrayList<>();

    public Usuario() {}


    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getLogin() { return login; }
    public void setLogin(String login) { this.login = login; }

    public String getSenha() { return senha; }
    public void setSenha(String senha) { this.senha = senha; }

    public String getNomeExibicao() { return nomeExibicao; }
    public void setNomeExibicao(String nomeExibicao) { this.nomeExibicao = nomeExibicao; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getBio() { return bio; }
    public void setBio(String bio) { this.bio = bio; }

    public String getAvatarUrl() { return avatarUrl; }
    public void setAvatarUrl(String avatarUrl) { this.avatarUrl = avatarUrl; }

    public String getBannerUrl() { return bannerUrl; }
    public void setBannerUrl(String bannerUrl) { this.bannerUrl = bannerUrl; }

    public String getInstagram() { return instagram; }
    public void setInstagram(String instagram) { this.instagram = instagram; }

    public String getDiscord() { return discord; }
    public void setDiscord(String discord) { this.discord = discord; }

    public String getTwitter() { return twitter; }
    public void setTwitter(String twitter) { this.twitter = twitter; }

    public String getTiktok() { return tiktok; }
    public void setTiktok(String tiktok) { this.tiktok = tiktok; }

    public String getSteam() { return steam; }
    public void setSteam(String steam) { this.steam = steam; }

    public String getItchIo() { return itchIo; }
    public void setItchIo(String itchIo) { this.itchIo = itchIo; }


    public List<String> getSeguindo() { return seguindo; }
    public void setSeguindo(List<String> seguindo) { this.seguindo = seguindo; }

    public List<String> getSeguidores() { return seguidores; }
    public void setSeguidores(List<String> seguidores) { this.seguidores = seguidores; }
}