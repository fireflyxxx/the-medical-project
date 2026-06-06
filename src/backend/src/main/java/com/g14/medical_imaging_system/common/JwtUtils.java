package com.g14.medical_imaging_system.common;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

@Component
public class JwtUtils {
    // 32-byte secret key for HMAC-SHA256 (at least 256 bits)
    private static final String SECRET_STRING = "MIIEpQIBAAKCAQEA0r1lqV0bK6XvR4fLpH7oN";
    private static final SecretKey KEY = Keys.hmacShaKeyFor(SECRET_STRING.getBytes());

    public static String generateToken(Long userId, String username, String role) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("userId", userId);
        claims.put("username", username);
        claims.put("role", role);

        long expMillis = System.currentTimeMillis() + 86400000; // 1 day
        return Jwts.builder()
                .claims(claims)
                .subject(username)
                .issuedAt(new Date())
                .expiration(new Date(expMillis))
                .signWith(KEY)
                .compact();
    }

    public static Claims parseToken(String token) {
        if (token != null && token.startsWith("Bearer ")) {
            token = token.substring(7);
        }
        return Jwts.parser()
                .verifyWith(KEY)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
