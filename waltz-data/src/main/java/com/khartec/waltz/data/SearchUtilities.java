/*
 * Waltz - Enterprise Architecture
 * Copyright (C) 2016, 2017 Waltz open source project
 * See README.md for more information
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

package com.khartec.waltz.data;

import com.khartec.waltz.common.StringUtilities;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Stream;

import static java.util.stream.Collectors.toList;

public class SearchUtilities
{
    public static List<String> mkTerms(String query) {
        if(query.length() < 3) return new ArrayList<>();

        String safeQuery = query
                .replace("[", " ")
                .replace("]", " ")
                .replace("'", " ")
                .replace("\"", " ")
                .replace("|", " ")
                .replace("!", " ")
                .replace("%", " ")
                .replace("(", " ")
                .replace(")", " ")
                .replace(",", " ")
                .replace("~", " ");

        String[] terms = safeQuery.split(" ");

        // ensure the first term is at least 3 characters
        if(terms.length == 1 && terms[0].length() < 3) return new ArrayList<>();

        return Stream.of(terms)
                .filter(StringUtilities::notEmpty)
                .collect(toList());
    }
}
