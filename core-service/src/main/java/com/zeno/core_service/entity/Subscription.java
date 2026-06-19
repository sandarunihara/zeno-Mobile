package com.zeno.core_service.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.util.UUID;

@Data
@Entity
@Table(name = "subscriptions")
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Subscription {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "service_name", nullable = false, length = 100)
    private String serviceName;

    @Column(name = "cost", nullable = false, precision = 10, scale = 2)
    private BigDecimal cost;

    @Column(name = "currency", length = 10)
    @Builder.Default
    private String currency = "LKR";

    @Column(name = "billing_cycle", nullable = false, length = 50)
    private String billingCycle;

    @Column(name = "status", length = 50)
    @Builder.Default
    private String status = "UNREVIEWED";

    @Column(name = "sender_email")
    private String senderEmail;

    @Column(name = "avatar_url")
    private String avatarUrl;

    @Column(name = "payment_date", length = 100)
    private String paymentDate;
}
