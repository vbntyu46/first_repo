#pragma once

#include <string>
#include <string_view>
#include <vector>

namespace quips {
    // Which pool of lines a death draws from.
    enum class Tier {
        Opening, // under 10%
        Early, // 10-49%
        Middle, // 50-79%
        Late, // 80-94%
        Choke, // 95% and up
        NewBest,
        Platformer,
        Practice,
    };

    struct Death {
        int percent = 0;
        int attempt = 1;
        bool newBest = false;
        bool platformer = false;
        bool practice = false;
    };

    Tier tierFor(Death const& death);

    // Splits the "custom-quips" setting ("a | b | c") into trimmed, non-empty lines.
    std::vector<std::string> parseCustom(std::string_view setting);

    // Picks a line for this death and fills in {percent} and {attempt}.
    std::string pick(Death const& death, std::vector<std::string> const& custom, bool onlyCustom);
}
