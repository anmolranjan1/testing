package com.compliance.main.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class EmployeeTypeListResponseDTO {
    private List<EmployeeTypeDTO> items;
    private int page;
    private int size;
    private long total;
}