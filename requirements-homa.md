# HOMA — Requirements

A new tab/module for the AIEWF app that teaches the Homa datacenter transport
protocol through an interactive simulation.

## Core model

Homa is a datacenter transport protocol built for RPC-style request/response
traffic, especially workloads with many very short messages, where TCP's
connection setup, stream semantics, and fair sharing create too much overhead
and tail latency. Its main ideas are message orientation, no connection setup,
receiver-driven grants, dynamic packet priorities, and limited buffering via
controlled overcommitment.

## Concepts to teach

The app should treat Homa as a small interactive world with a few visible
actors: senders, one receiver, a TOR switch with priority queues, messages split
into packets, and a grant controller on the receiver.

The most important concepts to visualize are:

- unscheduled vs scheduled bytes
- SRPT-like priority assignment
- receiver-driven flow control
- preemption lag
- overcommitment
- incast
- why message-based RPC avoids TCP-style head-of-line blocking

## Goal

Build an educational interactive app that explains how Homa achieves low tail
latency for short RPCs while maintaining high link utilization in datacenter
networks.

## Audience

- Systems engineers, networking students, and infra engineers who understand TCP
  basics but may not know receiver-driven transport design.
- Secondary audience: product-minded engineers who need intuition for why Homa
  differs from TCP and pHost-like designs.

## Learning outcomes

- Explain why TCP's stream orientation, connection state, and fair sharing are a
  poor fit for datacenter RPC-heavy workloads.
- Show why Homa sends only an initial unscheduled chunk immediately, then
  schedules the rest with receiver grants.
- Show how dynamic priority assignment approximates shortest-remaining-processing-time
  behavior with limited switch priority levels.
- Show why controlled overcommitment improves throughput/link utilization even
  though it allows some buffering.
- Show how Homa handles incast, out-of-order delivery, and retransmission.

## Core simulation objects

- Senders: each can hold multiple RPCs with message sizes, remaining bytes, and
  urgency.
- Receiver: tracks inbound RPCs, ranks them by remaining bytes, issues grants,
  and assigns priorities.
- Switch/TOR: exposes a small fixed number of priority queues and visible queue
  occupancy.
- Network links: configurable bandwidth, RTT, and packet loss.
- Packets: DATA, GRANT, RESEND, BUSY, plus optional ACK/NEED_ACK if modeling the
  newer Linux-facing description instead of just the SIGCOMM packet set.

## Main scenes

1. **TCP vs Homa** — Show the same workload in TCP and Homa to contrast
   connection setup, stream HoL blocking, and short-message completion time.
2. **Blind send then grant** — Show a message sending RTTbytes immediately, then
   waiting for GRANTs for the scheduled portion.
3. **Priority queues** — Show how smaller remaining messages get higher priority
   and bypass queued packets from larger ones.
4. **Preemption lag lab** — Let users create a bad policy with static or overly
   high scheduled priorities, then compare with Homa's lower-priority scheduled
   placement.
5. **Overcommitment lab** — Let users vary degree of overcommitment and watch
   utilization, latency, and buffer occupancy move together.
6. **Incast lab** — Trigger many simultaneous replies to one receiver and show
   how smaller unscheduled limits plus grants cap queue buildup.
7. **Failure lab** — Inject packet loss or a stalled sender and show RESEND/BUSY
   behavior and receiver-side loss detection.

## Controls

- Message size distribution selector: tiny-message heavy, mixed, heavy-tail.
- RTTbytes slider.
- Number of priority levels slider, default 8.
- Overcommitment slider: 1 to number of scheduled priorities.
- Incast fan-in slider: 1 to 1000.
- Packet spraying toggle to demonstrate out-of-order tolerance.
- Fault injection toggles: packet loss, delayed sender, missing grant.

## Metrics shown live

- P50/P99 message latency, especially for short messages.
- Link utilization / throughput.
- Switch queue occupancy by priority.
- Active vs inactive messages at the receiver.
- Granted-but-not-yet-received bytes.
- Wasted grant percentage and preemption lag events.

## Interaction design

- Time should be pausable, step-able, and replayable so users can inspect packet
  order and grant timing.
- Every animation should map to one protocol rule, not generic motion.
- The UI should always expose "why this packet moved now" as a tooltip, for
  example: "higher priority," "grant arrived," or "waiting for scheduled
  permission."

## Explanatory overlays

- **"Why not schedule everything?"**: because waiting for a scheduler would
  raise latency for tiny messages; Homa instead sends the first RTTbytes blindly.
- **"Why receiver-driven?"**: because the receiver knows inbound contention and
  can allocate priorities based on actual remaining sizes.
- **"Why allow some buffering?"**: because zero buffering wastes bandwidth when
  senders do not respond quickly to grants.

## Non-goals

- Do not attempt full protocol fidelity to every Linux kernel detail in v1.
- Do not model WAN behavior; this should stay focused on low-latency datacenter
  networks and RPC workloads.

## MVP

- One receiver, 3 to 8 senders, fixed topology, deterministic clock, and 4
  scenes: TCP vs Homa, blind-send-plus-grant, priority queues, and
  overcommitment.
- Enough interactivity to let users change message sizes, RTTbytes, and number of
  active grants and immediately see latency/utilization changes.

## Best visual framing

The best "micro world" metaphor is a rail yard or air-traffic control model,
where messages are trains or flights, the receiver is the tower, and switch
priorities are fast lanes with only a few slots. That metaphor matches Homa
better than a generic packet animation because the receiver is actively assigning
scarce priority lanes and permits, not just passively receiving data.
