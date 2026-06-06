package com.g14.medical_imaging_system.common;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

public final class TokenGuard {
    private TokenGuard() {
    }

    public static Claims requireToken(String token) {
        if (token == null || token.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Missing token in request header");
        }
        try {
            return JwtUtils.parseToken(token);
        } catch (JwtException e) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid or expired token");
        }
    }
    
    public static void requireRole(String token, String requiredRole) {
        Claims claims = requireToken(token);
        String role = claims.get("role", String.class);
        if (role == null || !role.equals(requiredRole)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Insufficient permissions");
        }
    }
    public static Long getUserId(String token) {
        io.jsonwebtoken.Claims claims = requireToken(token);
        Number userId = claims.get("userId", Number.class);
        return userId != null ? userId.longValue() : null;
    }

    public static String getRole(String token) {
        io.jsonwebtoken.Claims claims = requireToken(token);
        return claims.get("role", String.class);
    }


}
