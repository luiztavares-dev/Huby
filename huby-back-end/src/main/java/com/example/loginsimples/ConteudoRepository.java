package com.example.loginsimples;

import org.springframework.data.mongodb.repository.MongoRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface ConteudoRepository extends MongoRepository<Conteudo, String> {

    Optional<Conteudo> findFirstByTipoOrderByDataFimDesc(TipoConteudo tipo);

    List<Conteudo> findByGameJamIdOrderByRelevanciaDesc(String gameJamId);

    List<Conteudo> findByTipoOrderByRelevanciaDescNotaDesc(TipoConteudo tipo);

    List<Conteudo> findByDestaqueTrueOrderByDataPublicacaoDesc();

    List<Conteudo> findByTipoInOrderByDataPublicacaoDesc(List<TipoConteudo> tipos);

    List<Conteudo> findByTipoInOrderByDataInicioAsc(List<TipoConteudo> tipos);

    List<Conteudo> findByTipoOrderByDataInicioAsc(TipoConteudo tipo);

    List<Conteudo> findByTipoOrderByDataInicioDesc(TipoConteudo tipo);

    List<Conteudo> findByTipoInAndInscricoesAteGreaterThanEqualOrderByInscricoesAteAsc(
            List<TipoConteudo> tipos, LocalDate data);
}
