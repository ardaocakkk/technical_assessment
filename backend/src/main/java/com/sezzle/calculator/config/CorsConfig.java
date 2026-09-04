package com.sezzle.calculator.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Allows the Vite dev/nginx frontend origin to call the API from a browser.
 * The frontend (http://localhost:5173) and backend (http://localhost:8080) are
 * different origins in both the Docker Compose and manual dev setups, so without
 * this every browser POST /api/calculate would be blocked by the CORS policy.
 */
@Configuration
public class CorsConfig {

    private static final String FRONTEND_ORIGIN = "http://localhost:5173";

    @Bean
    public WebMvcConfigurer corsConfigurer() {
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(CorsRegistry registry) {
                registry.addMapping("/api/**")
                        .allowedOrigins(FRONTEND_ORIGIN)
                        .allowedMethods("GET", "POST", "OPTIONS")
                        .allowedHeaders("*")
                        .maxAge(3600);
            }
        };
    }
}
