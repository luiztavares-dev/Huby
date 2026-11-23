package com.example.loginsimples;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface ConteudoRepository extends MongoRepository<Conteudo, String> {

    Optional<Conteudo> findFirstByTipoOrderByDataFimDesc(TipoConteudo tipo);

    /** Comunidades que têm o usuário como membro; a lista embutida exige consulta aninhada. */
    @Query("{ 'tipo': 'COMUNIDADE', 'membros.usuarioId': ?0 }")
    List<Conteudo> findComunidadesDoMembro(String usuarioId);

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
