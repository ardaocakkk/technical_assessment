package com.sezzle.calculator.config;

import org.springframework.boot.jackson.autoconfigure.JsonMapperBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import tools.jackson.core.StreamWriteFeature;

/**
 * The strategies call {@code stripTrailingZeros()}, which can leave a BigDecimal that
 * serializes in scientific notation (100 becomes 1E+2). Valid JSON, but surprising for a
 * non-JavaScript client such as curl, so BigDecimals are always written in plain form.
 *
 * <p>This is a bean rather than a {@code spring.jackson.*} property because in Jackson 3
 * {@code WRITE_BIGDECIMAL_AS_PLAIN} is a {@link StreamWriteFeature}, and Spring Boot 4's
 * {@code spring.jackson} binding only exposes SerializationFeature / DeserializationFeature /
 * MapperFeature / JsonRead+JsonWriteFeature — none of which contain it.
 */
@Configuration
public class JacksonConfig {

    @Bean
    public JsonMapperBuilderCustomizer plainBigDecimalCustomizer() {
        return builder -> builder.enable(StreamWriteFeature.WRITE_BIGDECIMAL_AS_PLAIN);
    }
}
